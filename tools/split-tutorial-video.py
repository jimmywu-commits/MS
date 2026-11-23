"""Convert a progressive MP4 (one video + one audio track) into fragmented MP4
(one moof+mdat per video GOP) and split it into N files at fragment boundaries.

Every part starts with the same init segment (ftyp+moov), so the parts can be
appended one after another into a single MediaSource SourceBuffer (gapless),
and the manifest lists every fragment's byte offset/time so the player can
fetch any point with an HTTP Range request.

Usage (教學影片更新時)：python -I tools/split-tutorial-video.py <新影片.mp4> mov MS_tutorial 5
不需要 ffmpeg；每段要小於 20 MiB（TP 單檔上限，也符合 GitHub／GitLab 的 100MB），
超過就把最後的 5 調大（mov/index.html 會依 MS_tutorial.json 自動接起來，段數不限）。
換影片前先刪掉 mov 裡舊的 MS_tutorial_part*.mp4，避免段數變少時留下多的舊檔。
"""
import json, os, struct, sys

CONT = {b'moov', b'trak', b'mdia', b'minf', b'stbl', b'edts', b'dinf'}


def read_boxes(f, off, end):
    out = []
    while off < end:
        f.seek(off)
        h = f.read(8)
        if len(h) < 8:
            break
        size, typ = struct.unpack('>I4s', h)
        hdr = 8
        if size == 1:
            size = struct.unpack('>Q', f.read(8))[0]
            hdr = 16
        elif size == 0:
            size = end - off
        out.append((typ, off, size, hdr))
        off += size
    return out


def child(f, box, name):
    typ, off, size, hdr = box
    for b in read_boxes(f, off + hdr, off + size):
        if b[0] == name:
            return b
    return None


def raw(f, box):
    f.seek(box[1])
    return f.read(box[2])


def payload(f, box):
    f.seek(box[1] + box[3])
    return f.read(box[2] - box[3])


def fullbox_entries(f, box):
    p = payload(f, box)
    version = p[0]
    count = struct.unpack('>I', p[4:8])[0]
    return version, count, p[8:]


def parse_track(f, trak):
    tkhd = child(f, trak, b'tkhd')
    tk = payload(f, tkhd)
    track_id = struct.unpack('>I', tk[12:16] if tk[0] == 0 else tk[20:24])[0]
    mdia = child(f, trak, b'mdia')
    mdhd = child(f, mdia, b'mdhd')
    md = payload(f, mdhd)
    timescale = struct.unpack('>I', md[12:16] if md[0] == 0 else md[20:24])[0]
    handler = payload(f, child(f, mdia, b'hdlr'))[8:12]
    minf = child(f, mdia, b'minf')
    stbl = child(f, minf, b'stbl')
    stsd = child(f, stbl, b'stsd')

    # elst media_time (first entry) for composition shift
    media_time = 0
    edts = child(f, trak, b'edts')
    if edts:
        elst = child(f, edts, b'elst')
        if elst:
            v, n, body = fullbox_entries(f, elst)
            if n:
                media_time = struct.unpack('>q', body[8:16])[0] if v == 1 else struct.unpack('>i', body[4:8])[0]

    # sample sizes
    p = payload(f, child(f, stbl, b'stsz'))
    sample_size, count = struct.unpack('>II', p[4:12])
    sizes = [sample_size] * count if sample_size else list(struct.unpack('>%dI' % count, p[12:12 + 4 * count]))

    # decode times
    v, n, body = fullbox_entries(f, child(f, stbl, b'stts'))
    durations = []
    for i in range(n):
        c, d = struct.unpack('>II', body[8 * i:8 * i + 8])
        durations.extend([d] * c)
    assert len(durations) == count

    # composition offsets
    cts = [0] * count
    ctts = child(f, stbl, b'ctts')
    if ctts:
        v, n, body = fullbox_entries(f, ctts)
        idx = 0
        for i in range(n):
            c = struct.unpack('>I', body[8 * i:8 * i + 4])[0]
            o = struct.unpack('>i' if v == 1 else '>I', body[8 * i + 4:8 * i + 8])[0]
            for _ in range(c):
                cts[idx] = o
                idx += 1

    # sync samples (1-based); absent => all sync
    stss = child(f, stbl, b'stss')
    if stss:
        v, n, body = fullbox_entries(f, stss)
        sync = set(struct.unpack('>%dI' % n, body[:4 * n]))
        is_sync = [(i + 1) in sync for i in range(count)]
    else:
        is_sync = [True] * count

    # chunk offsets
    stco = child(f, stbl, b'stco')
    if stco:
        v, n, body = fullbox_entries(f, stco)
        chunk_off = list(struct.unpack('>%dI' % n, body[:4 * n]))
    else:
        v, n, body = fullbox_entries(f, child(f, stbl, b'co64'))
        chunk_off = list(struct.unpack('>%dQ' % n, body[:8 * n]))
    v, n, body = fullbox_entries(f, child(f, stbl, b'stsc'))
    stsc = [struct.unpack('>III', body[12 * i:12 * i + 12]) for i in range(n)]
    offsets = []
    s = 0
    for ci in range(len(chunk_off)):
        chunk_no = ci + 1
        spc = None
        for first, per, _sdi in stsc:
            if first <= chunk_no:
                spc = per
            else:
                break
        o = chunk_off[ci]
        for _ in range(spc):
            if s >= count:
                break
            offsets.append(o)
            o += sizes[s]
            s += 1
    assert len(offsets) == count, (len(offsets), count)

    dts = []
    t = 0
    for d in durations:
        dts.append(t)
        t += d

    return dict(track_id=track_id, timescale=timescale, handler=handler, stsd=raw(f, stsd),
                tkhd=raw(f, tkhd), mdhd=raw(f, mdhd), hdlr=raw(f, child(f, mdia, b'hdlr')),
                media_header=raw(f, read_boxes(f, minf[1] + minf[3], minf[1] + minf[2])[0]),
                dinf=raw(f, child(f, minf, b'dinf')),
                sizes=sizes, durations=durations, cts=cts, is_sync=is_sync, offsets=offsets,
                dts=dts, media_time=media_time, count=count)


def box(typ, *parts):
    body = b''.join(parts)
    return struct.pack('>I4s', 8 + len(body), typ) + body


def fullbox(typ, version, flags, *parts):
    return box(typ, struct.pack('>I', (version << 24) | flags), *parts)


def codec_string(track):
    st = track['stsd']
    if track['handler'] == b'vide':
        i = st.find(b'avcC')
        return 'avc1.%02x%02x%02x' % (st[i + 5], st[i + 6], st[i + 7])
    p = st.find(b'esds') + 4 + 4  # skip type + version/flags

    def desc(pos):
        tag = st[pos]
        pos += 1
        length = 0
        while True:
            b = st[pos]
            pos += 1
            length = (length << 7) | (b & 0x7f)
            if not b & 0x80:
                break
        return tag, pos, length

    tag, pos, _ = desc(p)
    assert tag == 0x03
    flags = st[pos + 2]
    pos += 3
    if flags & 0x80:
        pos += 2
    if flags & 0x40:
        pos += 1 + st[pos]
    if flags & 0x20:
        pos += 2
    tag, pos, _ = desc(pos)
    assert tag == 0x04
    oti = st[pos]
    tag, pos2, _ = desc(pos + 13)
    assert tag == 0x05
    aot = st[pos2] >> 3
    return 'mp4a.%02x.%d' % (oti, aot)


def build_init(f, moov, tracks, duration_ms):
    mvhd = raw(f, child(f, moov, b'mvhd'))
    traks = []
    for t in tracks:
        empty_stbl = box(b'stbl', t['stsd'],
                         fullbox(b'stts', 0, 0, struct.pack('>I', 0)),
                         fullbox(b'stsc', 0, 0, struct.pack('>I', 0)),
                         fullbox(b'stsz', 0, 0, struct.pack('>II', 0, 0)),
                         fullbox(b'stco', 0, 0, struct.pack('>I', 0)))
        minf = box(b'minf', t['media_header'], t['dinf'], empty_stbl)
        mdia = box(b'mdia', t['mdhd'], t['hdlr'], minf)
        traks.append(box(b'trak', t['tkhd'], mdia))
    mvex = box(b'mvex', fullbox(b'mehd', 1, 0, struct.pack('>Q', duration_ms)),
               *[fullbox(b'trex', 0, 0, struct.pack('>IIIII', t['track_id'], 1, 0, 0, 0)) for t in tracks])
    moov_new = box(b'moov', mvhd, *traks, mvex)
    ftyp = box(b'ftyp', b'iso6', struct.pack('>I', 0), b'iso6', b'isom', b'iso5', b'dash', b'mp41', b'avc1')
    return ftyp + moov_new


SYNC_FLAGS = 0x02000000
NONSYNC_FLAGS = 0x01010000


def build_fragment(seq, specs):
    """specs: list of (track, first, last_exclusive, comp_shift, is_video)"""
    def traf(track, a, b, shift, is_video, data_offset):
        flags = 0x1 | 0x100 | 0x200 | 0x400 | (0x800 if is_video else 0)
        rows = []
        for i in range(a, b):
            row = struct.pack('>II', track['durations'][i], track['sizes'][i])
            row += struct.pack('>I', SYNC_FLAGS if track['is_sync'][i] else NONSYNC_FLAGS)
            if is_video:
                row += struct.pack('>i', track['cts'][i] - shift)
            rows.append(row)
        trun = fullbox(b'trun', 1, flags, struct.pack('>Ii', b - a, data_offset), *rows)
        tfhd = fullbox(b'tfhd', 0, 0x020000, struct.pack('>I', track['track_id']))
        tfdt = fullbox(b'tfdt', 1, 0, struct.pack('>Q', track['dts'][a]))
        return box(b'traf', tfhd, tfdt, trun)

    # first pass with zero offsets to learn the moof size
    def make(offsets):
        return box(b'moof', fullbox(b'mfhd', 0, 0, struct.pack('>I', seq)),
                   *[traf(t, a, b, s, v, offsets[i]) for i, (t, a, b, s, v) in enumerate(specs)])
    moof = make([0] * len(specs))
    offs = []
    pos = len(moof) + 8
    for t, a, b, s, v in specs:
        offs.append(pos)
        pos += sum(t['sizes'][a:b])
    moof = make(offs)
    assert len(moof) + 8 == offs[0]
    data_len = pos - len(moof) - 8
    return moof, data_len


def main():
    src, out_dir, base, nparts = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    f = open(src, 'rb')
    end = f.seek(0, 2)
    top = read_boxes(f, 0, end)
    moov = [b for b in top if b[0] == b'moov'][0]
    traks = [b for b in read_boxes(f, moov[1] + moov[3], moov[1] + moov[2]) if b[0] == b'trak']
    tracks = [parse_track(f, t) for t in traks]
    video = [t for t in tracks if t['handler'] == b'vide'][0]
    audio = [t for t in tracks if t['handler'] == b'soun'][0]
    mvhd = payload(f, child(f, moov, b'mvhd'))
    mv_ts, mv_dur = struct.unpack('>II', mvhd[12:20]) if mvhd[0] == 0 else struct.unpack('>IQ', mvhd[20:32])
    duration = video['dts'][-1] + video['durations'][-1]
    duration_s = duration / video['timescale']

    init = build_init(f, moov, [video, audio], int(round(duration_s * 1000)))
    mime = 'video/mp4; codecs="%s, %s"' % (codec_string(video), codec_string(audio))

    keys = [i for i in range(video['count']) if video['is_sync'][i]]
    assert keys[0] == 0
    vt, at = video['timescale'], audio['timescale']
    # audio sample index at each GOP start (by decode time in seconds)
    frags = []
    ai = 0
    for gi, k in enumerate(keys):
        vend = keys[gi + 1] if gi + 1 < len(keys) else video['count']
        if gi + 1 < len(keys):
            t_next = video['dts'][vend] / vt
            aend = ai
            while aend < audio['count'] and audio['dts'][aend] / at < t_next:
                aend += 1
        else:
            aend = audio['count']
        frags.append((k, vend, ai, aend))
        ai = aend

    # build fragment headers and sizes first
    built = []
    for seq, (v0, v1, a0, a1) in enumerate(frags, 1):
        specs = [(video, v0, v1, video['media_time'], True)]
        if a1 > a0:
            specs.append((audio, a0, a1, 0, False))
        moof, data_len = build_fragment(seq, specs)
        built.append(dict(moof=moof, data_len=data_len, specs=specs,
                          size=len(moof) + 8 + data_len,
                          t=(video['dts'][v0] + 0) / vt))
    total = len(init) * nparts + sum(b['size'] for b in built)

    # choose split points at fragment boundaries nearest equal byte shares
    cum = []
    acc = 0
    for b in built:
        acc += b['size']
        cum.append(acc)
    cuts = []
    for p in range(1, nparts):
        target = acc * p / nparts
        cuts.append(min(range(len(cum)), key=lambda i: abs(cum[i] - target)) + 1)
    bounds = [0] + cuts + [len(built)]

    os.makedirs(out_dir, exist_ok=True)
    manifest = dict(version=1, mime=mime, duration=round(duration_s, 3), initSize=len(init),
                    parts=[], fragments=[])
    for p in range(nparts):
        name = '%s_part%d.mp4' % (base, p + 1)
        path = os.path.join(out_dir, name)
        with open(path, 'wb') as o:
            o.write(init)
            for fi in range(bounds[p], bounds[p + 1]):
                b = built[fi]
                manifest['fragments'].append([p, o.tell(), b['size'], round(b['t'], 4)])
                o.write(b['moof'])
                o.write(struct.pack('>I4s', 8 + b['data_len'], b'mdat'))
                for t, a, z, _s, _v in b['specs']:
                    for i in range(a, z):
                        f.seek(t['offsets'][i])
                        o.write(f.read(t['sizes'][i]))
            size = o.tell()
        manifest['parts'].append(dict(file=name, size=size,
                                      start=round(built[bounds[p]]['t'], 4),
                                      end=round(built[bounds[p + 1]]['t'], 4) if p + 1 < nparts else round(duration_s, 4)))
        print('%s  %.1f MB (%d bytes)  fragments %d-%d' % (name, size / 1048576, size, bounds[p], bounds[p + 1] - 1))
    with open(os.path.join(out_dir, base + '.json'), 'w', encoding='utf-8') as o:
        json.dump(manifest, o, ensure_ascii=False, separators=(',', ':'))
    print('mime', mime, 'duration', duration_s, 'fragments', len(built), 'video media_time', video['media_time'],
          'audio media_time', audio['media_time'])


if __name__ == '__main__':
    main()
