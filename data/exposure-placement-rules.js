(function (global) {
  'use strict';

  /* Snapshot of the authorized MS與BN曝光版位 Google Sheet.
     V ＝預設顯示並勾選；- ＝不列入版位清單；「有資源才做」＝追加版位，
     只有按下曝光資源的「＋追加版位」後才顯示，預設不勾選。
     目前同步最新 K:Y 欄；各等級的 optionalColumns 是藍底紅字欄位。 */
  global.BODA_EXPOSURE_PLACEMENT_RULES = {
    source: {
      title: 'MS與BN曝光版位',
      sheet: 'MS與BN曝光版位',
      range: 'D1:Y10',
      url: 'https://docs.google.com/spreadsheets/d/1PlYrsjiqMCeMJ-Hmsmn4mCFhMvxswwaCVtbUv_O5oQ0/edit?gid=0',
      syncedAt: '2026-11-19'
    },
    resources: [
      { column: 'K', header: 'LPBN', catalogKey: 'LPBN' },
      { column: 'L', header: 'DDCARD', catalogKey: 'DDCard' },
      { column: 'M', header: 'MALL HBN', catalogKey: 'HBN' },
      { column: 'N', header: '活動總覽', catalogKey: '活動總覽' },
      { column: 'O', header: '首頁LOGO牆', catalogKey: '首頁LOGO牆' },
      { column: 'P', header: 'AR', catalogKey: 'AR' },
      { column: 'Q', header: 'SCBN', catalogKey: 'SCPN' },
      { column: 'R', header: 'POPUP', catalogKey: 'POPUP' },
      { column: 'S', header: 'FB POST', catalogKey: 'FB_Post' },
      { column: 'T', header: 'Campaign Card', catalogKey: 'CampaignCard' },
      { column: 'U', header: 'AMS BN', catalogKey: 'AMS BN' },
      { column: 'V', header: 'Coinpage', catalogKey: 'Coin_page' },
      { column: 'W', header: 'IG', catalogKey: 'IG' },
      { column: 'X', header: 'Search Icon', catalogKey: 'SearchIcon' },
      { column: 'Y', header: 'Search Image', catalogKey: 'SearchImage' }
    ],
    levels: [
      { id: 'brand_star_mega', label: '大促 Brand star', checkedColumns: ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'], optionalColumns: ['S', 'U', 'V', 'W', 'X', 'Y'] },
      { id: 'brand_star_mega_zj', label: '大促 Brand star 資交', checkedColumns: ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'], optionalColumns: ['S', 'U', 'V', 'W', 'X', 'Y'] },
      { id: 'ad_multi', label: 'AD單買(多店活動)', checkedColumns: ['K', 'L', 'M', 'N'], optionalColumns: ['P', 'S', 'U', 'V', 'W', 'X', 'Y'] },
      { id: 'ad_bn_only', label: 'AD單買(BN Only)', checkedColumns: ['L', 'M', 'N'], optionalColumns: ['P', 'S', 'U', 'V', 'W', 'X', 'Y'] },
      { id: 'bod_a_plus', label: 'A BOD+', checkedColumns: ['K', 'L', 'M', 'N', 'O', 'P', 'S', 'T', 'U'], optionalColumns: ['V', 'W', 'X', 'Y'] },
      { id: 'bod_a', label: 'A BOD', checkedColumns: ['K', 'L', 'M', 'N', 'O', 'P', 'S', 'U'], optionalColumns: ['V', 'W', 'X', 'Y'] },
      { id: 'bod_a_plus_zj', label: 'A BOD+(資交)', checkedColumns: ['L', 'M', 'N', 'O', 'P', 'S', 'T', 'U'], optionalColumns: ['V', 'W', 'X', 'Y'] },
      { id: 'bod_a_zj', label: 'A BOD(資交)', checkedColumns: ['L', 'M', 'N', 'O', 'P', 'S', 'U'], optionalColumns: ['V', 'W', 'X', 'Y'] },
      { id: 'jbp_multi', label: 'B級 JBP(多店活動)', checkedColumns: ['K', 'L', 'M', 'N'], optionalColumns: ['P', 'Q', 'S', 'V', 'W', 'X', 'Y'] }
    ]
  };
})(window);
