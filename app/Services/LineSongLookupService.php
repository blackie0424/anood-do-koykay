<?php

namespace App\Services;

use App\Models\Song;

class LineSongLookupService
{
    // 一般文字（不是 LINE 標記的藍字）的 @Anood 前綴：不分大小寫，可接「助理」。
    private const BOT_PREFIX_PATTERN = '/^@anood(?:助理)?/iu';

    private const CATALOG_KEYWORD = '目錄';

    /**
     * 解析 LINE 訊息文字，取出查詢內容。
     * 群組／多人聊天室裡，文字被認定是叫 Bot（見 isAddressedByPlainText）時，只去掉開頭的 @Anood 前綴一次
     * （例如「@Anood @王小明」→「@王小明」）；其他情況（私訊、Bot 改名後的真 @「@詩歌小秘書 44」、
     * 「@Anoodle 44」）沿用舊規則：去除開頭整段 @mention 與頭尾空白。
     */
    public function parseQuery(string $text, bool $inMultiPersonChat = false): string
    {
        if ($inMultiPersonChat && $this->isAddressedByPlainText($text)) {
            $text = $this->trimSpaces($text);
            preg_match(self::BOT_PREFIX_PATTERN, $text, $match);

            return $this->trimSpaces(substr($text, strlen($match[0])));
        }

        $text = trim($text);
        $text = preg_replace('/^@\S+\s*/u', '', $text) ?? $text;

        return trim($text);
    }

    /**
     * 群組裡手打的「@Anood…」算不算在叫 Bot。
     * 前綴後面有空白或訊息結束：算。前綴後面緊接其他字：只有剩下的字剛好是「目錄」或純數字頁碼才算，
     * 避免「@Anood其他人 44」這種對別人說的話被當成點歌。
     */
    public function isAddressedByPlainText(string $text): bool
    {
        $text = $this->trimSpaces($text);

        if (! preg_match(self::BOT_PREFIX_PATTERN, $text, $match)) {
            return false;
        }

        $rest = substr($text, strlen($match[0]));

        if ($rest === '' || preg_match('/^[\s\x{3000}]/u', $rest)) {
            return true;
        }

        return $rest === self::CATALOG_KEYWORD || ctype_digit($rest);
    }

    private function trimSpaces(string $text): string
    {
        return preg_replace('/^[\s\x{3000}]+|[\s\x{3000}]+$/u', '', $text) ?? $text;
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
