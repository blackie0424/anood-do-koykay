#!/bin/bash
set -e

composer install --no-dev --optimize-autoloader
npm ci
npm run build
