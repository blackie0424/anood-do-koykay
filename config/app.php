<?php

return [

    'name' => env('APP_NAME', '達悟族語歌謠學習系統'),

    'env' => env('APP_ENV', 'production'),

    'debug' => (bool) env('APP_DEBUG', false),

    'url' => env('APP_URL', 'http://localhost'),

    // 歌曲播放頁的診斷資訊列（播放位置、歌詞高亮索引、音檔網址等）。
    // 平常關閉；播放出問題要現場排查時開啟，開啟期間所有使用者都看得到。
    'player_diagnostics' => (bool) env('PLAYER_DIAGNOSTICS', false),

    'timezone' => 'Asia/Taipei',

    'locale' => 'zh_TW',

    'fallback_locale' => 'en',

    'faker_locale' => 'zh_TW',

    'cipher' => 'AES-256-CBC',

    'key' => env('APP_KEY'),

    'previous_keys' => [
        ...array_filter(
            explode(',', env('APP_PREVIOUS_KEYS', ''))
        ),
    ],

    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
        'store' => env('APP_MAINTENANCE_STORE', 'database'),
    ],

];
