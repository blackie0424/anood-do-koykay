#!/bin/bash
set -e

php artisan migrate --force

# 提高 nginx 上傳大小限制（音頻/圖片檔案）
echo 'client_max_body_size 100m;' > /etc/nginx/conf.d/upload_limit.conf

php-fpm -D
exec nginx -g 'daemon off;'
