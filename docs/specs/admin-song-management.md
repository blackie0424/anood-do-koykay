# 後台歌曲管理規格 v1.0

**確定日期：** 2026-06-26

---

## 頁面流程

```
新增歌曲 → [頁面1] 基本資料 → [頁面2] 媒體上傳 → [頁面3] 歌詞編輯
```

---

## 頁面 1：基本資料

**路由：** `GET /admin/songs/create` | `GET /admin/songs/{id}/edit`
**Component：** `Admin/SongEdit.vue`

欄位：
- 族語名稱（必填）
- 中文名稱（選填）
- 狀態：draft / published

行為：
- 儲存成功 → redirect 到 `/admin/songs/{id}/media`
- 已有歌曲時，顯示「前往歌詞編輯 →」捷徑連結

---

## 頁面 2：媒體上傳

**路由：** `GET /admin/songs/{id}/media`
**Component：** `Admin/SongMedia.vue`

區塊 1 — 樂譜圖片：
- 接受 jpg / png / webp，max 10MB
- 上傳成功後顯示圖片預覽
- 已有圖片時直接顯示，可重新上傳覆蓋

區塊 2 — 完整錄音：
- 接受 mp3 / wav / ogg / m4a，max 50MB
- 上傳成功後顯示音頻播放器
- 已有錄音時直接顯示，可重新上傳覆蓋

行為：
- 兩個上傳各自獨立，不互相依賴
- 頁面底部顯示「前往歌詞編輯 →」按鈕

---

## 頁面 3：歌詞編輯

**路由：** `GET /admin/songs/{id}/lyrics`
**Component：** `Admin/SongLyrics.vue`

版面：
```
┌─────────────────────────────────────────┐
│  [▶ 播放器]  目前時間：0:00.0            │
├──────────────────┬──────────────────────┤
│  樂譜圖片 (40%)  │  歌詞列表 (60%)      │
│                  │  行# | 族語 | 中文   │
│                  │       | 起始 | 結束  │
└──────────────────┴──────────────────────┘
```

播放器：
- 播放 / 暫停
- 顯示目前時間，格式 `0:00.0`（精確 0.1 秒）

歌詞列表每行：
- 族語歌詞（可編輯）
- 中文翻譯（可編輯）
- 起始時間（數字輸入）+ 「標記起始」按鈕 → 填入目前播放時間
- 結束時間（數字輸入）+ 「標記結束」按鈕 → 填入目前播放時間

行為：
- OCR 辨識結果（`lines_draft`）預填族語欄位
- 「儲存歌詞」→ `POST /api/admin/songs/{id}/lines/batch`

---

## 後端

`Admin/SongController.php` 新增：
- `mediaPage(Song $song)`
- `lyricsPage(Song $song)` — 傳入 `song->load('lines')`

`routes/web.php` 新增（auth middleware 內）：
```php
Route::get('/songs/{song}/media', [Admin\SongController::class, 'mediaPage'])->name('admin.songs.media');
Route::get('/songs/{song}/lyrics', [Admin\SongController::class, 'lyricsPage'])->name('admin.songs.lyrics');
```

---

## 不在本次範圍

- 逐行錄音上傳（`audio_line`）
- 公開頁面的歌詞同步播放
