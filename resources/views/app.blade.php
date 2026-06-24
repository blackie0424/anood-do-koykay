<!DOCTYPE html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <meta name="description" content="蘭嶼達悟族傳統魚類資料庫" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#1976d2">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="達悟魚類圖鑑">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="application-name" content="達悟魚類圖鑑">
    <meta name="msapplication-TileColor" content="#1976d2">
    <meta name="msapplication-tap-highlight" content="no">
    
    <!-- Icons -->
    <link rel="icon" type="image/png" href="{{ asset('icons/icon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('icons/icon-192x192.png') }}">
    <link rel="apple-touch-icon" sizes="192x192" href="{{ asset('icons/icon-192x192.png') }}">
    <link rel="apple-touch-icon" sizes="512x512" href="{{ asset('icons/icon-512x512.png') }}">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    @vite(['resources/css/app.css', 'resources/css/fish.css', 'resources/js/app.js'])
    @inertiaHead
    
    <!-- Service Worker Registration -->
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/service-worker.js')
            .then(function(registration) {
              console.log('SW registered:', registration.scope);
              
              // 檢查更新
              registration.addEventListener('updatefound', function() {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', function() {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // 新版本可用，可以通知使用者
                    console.log('New version available');
                  }
                });
              });
            })
            .catch(function(error) {
              console.log('SW registration failed:', error);
            });
        });
      }
    </script>
  </head>
  <body>
    @inertia
  </body>
</html>
