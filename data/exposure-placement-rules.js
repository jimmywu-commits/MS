(function (global) {
  'use strict';

  /* Snapshot of the authorized MS與BN曝光版位 Google Sheet.
     K:S use the sheet's v/- values. T:W are conditional: include only when the
     imported Work Order Overview lists that resource. */
  global.BODA_EXPOSURE_PLACEMENT_RULES = {
    source: {
      title: 'MS與BN曝光版位',
      sheet: 'MS與BN曝光版位',
      range: 'D1:W10',
      url: 'https://docs.google.com/spreadsheets/d/1PlYrsjiqMCeMJ-Hmsmn4mCFhMvxswwaCVtbUv_O5oQ0/edit?gid=0',
      syncedAt: '2026-11-13'
    },
    resources: [
      { column: 'K', header: 'LPBN', catalogKey: 'LPBN' },
      { column: 'L', header: 'DDCARD', catalogKey: 'DDCard' },
      { column: 'M', header: 'MALL HBN', catalogKey: 'HBN' },
      { column: 'N', header: '活動總覽', catalogKey: '活動總覽' },
      { column: 'O', header: '首頁LOGO牆', catalogKey: '首頁LOGO牆' },
      { column: 'P', header: 'AR', catalogKey: 'AR' },
      { column: 'Q', header: 'FB POST', catalogKey: 'FB_Post' },
      { column: 'R', header: 'Campaign Card', catalogKey: 'SCPN' },
      { column: 'S', header: 'AMS BN', catalogKey: 'AMS BN' },
      { column: 'T', header: 'Coinpage', catalogKey: 'Coin_page', mode: 'workorder-presence' },
      { column: 'U', header: 'IG', catalogKey: 'IG', mode: 'workorder-presence' },
      { column: 'V', header: 'Search Icon', catalogKey: 'SearchIcon', mode: 'workorder-presence' },
      { column: 'W', header: 'Search Image', catalogKey: 'SearchImage', mode: 'workorder-presence' }
    ],
    levels: [
      { id: 'brand_star_mega', label: '大促 Brand star', checkedColumns: ['K', 'L', 'M', 'N', 'O', 'P'] },
      { id: 'brand_star_mega_zj', label: '大促 Brand star 資交', checkedColumns: ['K', 'L', 'M', 'N', 'O', 'P'] },
      { id: 'ad_multi', label: 'AD單買(多店活動)', checkedColumns: ['K', 'L', 'M', 'N'] },
      { id: 'ad_bn_only', label: 'AD單買(BN Only)', checkedColumns: ['L', 'M', 'N'] },
      { id: 'bod_a_plus', label: 'A BOD+', checkedColumns: ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'] },
      { id: 'bod_a', label: 'A BOD', checkedColumns: ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'S'] },
      { id: 'bod_a_plus_zj', label: 'A BOD+(資交)', checkedColumns: ['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'] },
      { id: 'bod_a_zj', label: 'A BOD(資交)', checkedColumns: ['L', 'M', 'N', 'O', 'P', 'Q', 'S'] },
      { id: 'jbp_multi', label: 'B級 JBP(多店活動)', checkedColumns: ['K', 'L', 'M', 'N'] }
    ]
  };
})(window);
