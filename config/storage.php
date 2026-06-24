<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Storage Drivers Configuration
    |--------------------------------------------------------------------------
    |
    | AWS S3 儲存驅動設定
    |
    */

    'drivers' => [
        's3' => [
            'bucket' => env('AWS_BUCKET'),
            'region' => env('AWS_DEFAULT_REGION', 'ap-southeast-1'),
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),

            'folders' => [
                'image' => env('AWS_IMAGE_FOLDER', 'images'),
                'audio' => env('AWS_AUDIO_FOLDER', 'audio'),
                'webp' => env('AWS_WEBP_FOLDER', 'webp'),
            ],
        ],
    ],

];
