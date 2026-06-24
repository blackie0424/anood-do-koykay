<?php

return [
    // 預設每批回傳筆數（PWA 無限滾動用批次大小），單次搜尋會話期間固定。
    'per_page_default' => env('FISH_SEARCH_PER_PAGE_DEFAULT', 100),

    // 允許的最大每批筆數上限（伺服器防護界線）。
    'per_page_max' => env('FISH_SEARCH_PER_PAGE_MAX', 200),

    // 前瞻抓取是否啟用（perPage+1），用來正確判斷 hasMore。
    'lookahead_enabled' => env('FISH_SEARCH_LOOKAHEAD_ENABLED', true),

    // 慢查詢門檻（毫秒）目前僅佔位：本期不記錄持久 log；若未來導入 APM 或遷移平台可啟用對超過此值的查詢進行警示/記錄。
    // 啟用示例（未來）：
    // DB::listen(function($query){
    //   $threshold = config('fish_search.slow_query_ms');
    //   if($threshold && isset($query->time) && $query->time > $threshold){
    //       // 這裡可接 APM 或暫時輸出到 stdout（正式環境避免持久檔案寫入）
    //       // error_log('[SLOW_QUERY] '.$query->sql.' ('.$query->time.' ms)');
    //   }
    // });
    'slow_query_ms' => env('FISH_SEARCH_SLOW_QUERY_MS', 1000),
];
