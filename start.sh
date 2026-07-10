#!/bin/bash
set -e

# Increase nginx upload size limit (default 1m is too small for audio files)
echo 'client_max_body_size 55m;' > /etc/nginx/conf.d/upload-limit.conf

# Increase PHP upload limits to match Laravel validation (max 50MB)
PHP_CONF_DIR=$(php -r "echo PHP_CONFIG_FILE_SCAN_DIR;" 2>/dev/null || echo "/usr/local/etc/php/conf.d")
echo "upload_max_filesize=52M" >> "${PHP_CONF_DIR}/uploads.ini"
echo "post_max_size=55M" >> "${PHP_CONF_DIR}/uploads.ini"

php artisan migrate --force

php-fpm -D
exec nginx -g 'daemon off;'
