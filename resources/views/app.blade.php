<!DOCTYPE html>
<html lang="zh-Hant" style="background-color:#fffbeb">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="達悟族語歌謠學習系統">
        <title>達悟族語歌謠學習系統</title>
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#1c1917">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="Anood">
        <link rel="apple-touch-icon" href="/icons/icon-180.png">
        {{-- iOS PWA startup image：系統在 WebView 啟動前就顯示，不依賴瀏覽器渲染 --}}
        {{-- iPhone SE (3rd) --}}
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash/splash-750x1334.png">
        {{-- iPhone 12 / 13 / 14 --}}
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/icons/splash/splash-1170x2532.png">
        {{-- iPhone 14 Plus --}}
        <link rel="apple-touch-startup-image" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" href="/icons/splash/splash-1284x2778.png">
        {{-- iPhone 14 Pro / 15 / 15 Pro --}}
        <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/icons/splash/splash-1179x2556.png">
        {{-- iPhone 14 Pro Max / 15 Plus / 15 Pro Max --}}
        <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/icons/splash/splash-1290x2796.png">
        {{-- iPad Air / iPad Pro 11" --}}
        <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash/splash-1668x2388.png">
        {{-- iPad Pro 12.9" --}}
        <link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/icons/splash/splash-2048x2732.png">
        <style>
            #app-splash {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background-color: #fffbeb;
                gap: 24px;
            }
            #app-splash.splash-hidden {
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.4s ease;
            }
            .splash-icon-wrap {
                position: relative;
                width: 120px;
                height: 120px;
            }
            /* 底層：icon 以低透明度顯示為輪廓 */
            .splash-icon-base {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                opacity: 0.12;
            }
            /* 上層：從下往上填黑的 icon */
            .splash-icon-fill {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                clip-path: inset(100% 0 0 0);
                animation: iconFillUp 1.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
            }
            @keyframes iconFillUp {
                0%   { clip-path: inset(100% 0 0 0); }
                100% { clip-path: inset(0% 0 0 0); }
            }
            .splash-title {
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 1.1rem;
                font-weight: 600;
                color: #1c1917;
                letter-spacing: 0.05em;
                opacity: 0;
                animation: splashTitleFade 0.6s ease 1.0s forwards;
            }
            .splash-subtitle {
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 0.8rem;
                color: #78716c;
                letter-spacing: 0.03em;
                margin-top: -16px;
                opacity: 0;
                animation: splashTitleFade 0.6s ease 1.2s forwards;
            }
            @keyframes splashTitleFade {
                from { opacity: 0; transform: translateY(4px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        </style>
        <link rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'" href="{{ \Illuminate\Support\Facades\Vite::asset('resources/css/app.css') }}">
        <noscript><link rel="stylesheet" href="{{ \Illuminate\Support\Facades\Vite::asset('resources/css/app.css') }}"></noscript>
        @vite(['resources/js/app.js'])
        @inertiaHead
    </head>
    <body style="-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale">
        {{-- App Shell 載入動畫：Vue 掛載後自動移除 --}}
        <div id="app-splash" aria-hidden="true" aria-label="載入中">
            <div class="splash-icon-wrap">
                <img class="splash-icon-base" src="/icons/icon-192.png" alt="" draggable="false">
                <img class="splash-icon-fill" src="/icons/icon-192.png" alt="" draggable="false">
            </div>
            <p class="splash-title">Anood</p>
            <p class="splash-subtitle">達悟族語歌謠學習系統</p>
        </div>
        @inertia
    </body>
</html>
