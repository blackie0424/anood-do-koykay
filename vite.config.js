import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.js'],
      refresh: true,
    }),
    vue(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'resources/js'),
    },
  },
  test: {
    environment: 'jsdom', // 這行很重要，讓測試有瀏覽器文件環境
    coverage: {
      provider: 'v8', // 使用 V8 引擎計算覆蓋率
      reporter: ['text', 'html', 'lcov'], // 生成文字、HTML 和 LCOV 格式報告
      include: ['src/**/*.{js,vue}'], // 覆蓋 src 目錄下的 JS 和 Vue 檔案
      exclude: ['src/tests/**/*'], // 排除測試檔案
    },
  },
})
