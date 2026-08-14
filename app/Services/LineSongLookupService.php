<?php

namespace App\Services;

use App\Models\Song;

class LineSongLookupService
{
    /**
     * 解析 LINE 訊息文字：去除開頭的群組 @mention（例如「@詩歌小秘書 44」→「44」），並去除頭尾空白。
     */
    public function parseQuery(string $text): string
    {
        $text = trim($text);
        $text = preg_replace('/^@\S+\s*/u', '', $text) ?? $text;

        return trim($text);
    }

    /**
     * 依查詢字串找已發佈的歌：純數字查 book_number，其餘查 title_native / title_zh 部分比對。
     */
    public function find(string $query): ?Song
    {
        if ($query === '') {
            return null;
        }

        if (ctype_digit($query)) {
            return Song::where('status', 'published')
                ->where('book_number', $query)
                ->first();
        }

        return Song::where('status', 'published')
            ->where(function ($q) use ($query) {
                $q->where('title_native', 'like', "%{$query}%")
                    ->orWhere('title_zh', 'like', "%{$query}%");
            })
            ->first();
    }
}
