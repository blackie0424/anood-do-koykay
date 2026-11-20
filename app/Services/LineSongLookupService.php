<?php

namespace App\Services;

use App\Models\Song;
use Illuminate\Support\Collection;

class LineSongLookupService
{
    // 一般文字（不是 LINE 標記的藍字）的 @Anood 前綴：不分大小寫，可接「助理」。
    private const BOT_PREFIX_PATTERN = '/^@anood(?:助理)?/iu';

    public const CATALOG_KEYWORD = '目錄';

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

    /**
     * 目錄用的歌曲清單：已發佈的歌，有頁碼的在前（依頁碼數值、再依編號），沒有頁碼的在後（依編號）。
     * 頁碼只認首碼 1～9 的 ASCII 純數字；NULL、空白、前導零、全形、含字母都算沒有頁碼。
     * 在程式內分類排序，不靠資料庫轉型，避免不同資料庫行為不同。
     *
     * @return Collection<int, array{id: int, title: string, page: ?string}>
     */
    public function catalogSongs(): Collection
    {
        $songs = Song::where('status', 'published')
            ->orderBy('id')
            ->get(['id', 'title_native', 'book_number'])
            ->map(fn (Song $song) => [
                'id' => $song->id,
                'title' => $song->title_native,
                'page' => preg_match('/^[1-9][0-9]*$/D', (string) $song->book_number) ? $song->book_number : null,
            ]);

        return $songs->sortBy([
            fn ($a, $b) => ($a['page'] === null) <=> ($b['page'] === null),
            // 頁碼保留原字串（最長 20 字元，可能超過整數範圍）；沒有前導零，所以位數少的較小，位數相同再比字串
            fn ($a, $b) => [strlen($a['page'] ?? ''), $a['page']] <=> [strlen($b['page'] ?? ''), $b['page']],
            fn ($a, $b) => $a['id'] <=> $b['id'],
        ])->values();
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
            // 同頁碼有多首時固定回編號最小的一首（與目錄的排序一致）
            return Song::where('status', 'published')
                ->where('book_number', $query)
                ->orderBy('id')
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
