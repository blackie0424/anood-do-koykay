<?php

return [
    'channel_secret'       => env('LINE_CHANNEL_SECRET'),
    'channel_access_token' => env('LINE_CHANNEL_ACCESS_TOKEN'),
    'viewer_rich_menu_id'  => env('LINE_VIEWER_RICH_MENU_ID'),
    'editor_rich_menu_id'  => env('LINE_EDITOR_RICH_MENU_ID'),

    // LINE Login OAuth 2.0
    'login_channel_id'     => env('LINE_LOGIN_CHANNEL_ID'),
    'login_channel_secret' => env('LINE_LOGIN_CHANNEL_SECRET'),
    'login_callback_url'   => env('LINE_LOGIN_CALLBACK_URL'),
];
