#!/bin/bash
set -e

php artisan migrate --force

exec /usr/bin/supervisord -n -c /etc/supervisord.conf
