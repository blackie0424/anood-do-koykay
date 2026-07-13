#!/bin/bash
set -e

# 提高 nginx 上傳大小限制（音頻/圖片檔案）
echo 'client_max_body_size 100m;' > /etc/nginx/conf.d/upload_limit.conf

# 提高 PHP 上傳限制與執行時間
PHP_CONF_DIR=$(php -r "echo PHP_CONFIG_FILE_SCAN_DIR;" 2>/dev/null || echo "/usr/local/etc/php/conf.d")
echo "upload_max_filesize=100M" >> "${PHP_CONF_DIR}/uploads.ini"
echo "post_max_size=105M" >> "${PHP_CONF_DIR}/uploads.ini"
echo "max_execution_time=300" >> "${PHP_CONF_DIR}/uploads.ini"
echo "max_input_time=300" >> "${PHP_CONF_DIR}/uploads.ini"

# 提高 nginx proxy / fastcgi 逾時
echo 'proxy_read_timeout 300s; proxy_send_timeout 300s; fastcgi_read_timeout 300s;' > /etc/nginx/conf.d/timeout.conf

php artisan migrate --force

php-fpm -D
exec nginx -g 'daemon off;'
