<?php

namespace App\Services;

use Illuminate\Support\Collection;

/**
 * 把已發佈歌曲組成 LINE 的目錄輪播（Flex Message carousel）。
 * 有頁碼與沒頁碼的歌分開成不同卡片；每張卡片最多 SONGS_PER_CARD 首，輪播最多 MAX_CARDS 張。
 */
class LineCatalogBuilder
{
    private const SONGS_PER_CARD = 8;

    private const MAX_CARDS = 12;

    private const PAGE_COLOR = '#2F7D5B';

    private const NO_PAGE_COLOR = '#8A6D1F';

    private const NAV_COLOR = '#5A6772';

    private const EMPTY_MESSAGE = '目前還沒有已發佈的歌曲';

    private const NO_PAGE_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

    // LINE 的動作標籤最多 20 字
    private const ACTION_LABEL_LIMIT = 20;

    /**
     * @param  Collection<int, array{id: int, title: string, page: ?string}>  $songs  已排好序（有頁碼在前）
     */
    public function build(Collection $songs, bool $inMultiPersonChat, string $siteUrl): array
    {
        $total = $songs->count();
        if ($total === 0) {
            return ['type' => 'text', 'text' => self::EMPTY_MESSAGE];
        }

        $cards = $this->splitIntoCards($songs);
        $overflow = count($cards) > self::MAX_CARDS;
        if ($overflow) {
            $cards = array_slice($cards, 0, self::MAX_CARDS - 1);
        }

        $cardCount = $overflow ? self::MAX_CARDS : count($cards);
        $bubbles = [];
        foreach ($cards as $index => $card) {
            $subtitle = $this->subtitle($index + 1, $cardCount, $total);
            $bubbles[] = $this->songBubble($card, $subtitle, $inMultiPersonChat, $siteUrl);
        }

        if ($overflow) {
            $listed = array_sum(array_map(fn ($card) => count($card['songs']), $cards));
            $bubbles[] = $this->navBubble($total - $listed, $this->subtitle($cardCount, $cardCount, $total), $siteUrl);
        }

        return [
            'type' => 'flex',
            'altText' => "Anood 詩歌目錄，共 {$total} 首",
            'contents' => ['type' => 'carousel', 'contents' => $bubbles],
        ];
    }

    /** @return array<int, array{hasPage: bool, number: ?int, songs: array}> */
    private function splitIntoCards(Collection $songs): array
    {
        [$withPage, $withoutPage] = $songs->partition(fn ($song) => $song['page'] !== null);

        $groups = [[true, $withPage], [false, $withoutPage]];
        $cards = [];
        foreach ($groups as [$hasPage, $group]) {
            $chunks = $group->chunk(self::SONGS_PER_CARD);
            foreach ($chunks->values() as $number => $chunk) {
                $cards[] = [
                    'hasPage' => $hasPage,
                    'number' => $chunks->count() > 1 ? $number : null,
                    'songs' => $chunk->values()->all(),
                ];
            }
        }

        return $cards;
    }

    private function subtitle(int $position, int $cardCount, int $total): string
    {
        return "第 {$position} 張／共 {$cardCount} 張・共 {$total} 首";
    }

    private function songBubble(array $card, string $subtitle, bool $inMultiPersonChat, string $siteUrl): array
    {
        $hasPage = $card['hasPage'];

        return [
            'type' => 'bubble',
            'header' => $this->header($this->cardTitle($card), $subtitle, $hasPage ? self::PAGE_COLOR : self::NO_PAGE_COLOR),
            'body' => [
                'type' => 'box',
                'layout' => 'vertical',
                'spacing' => 'md',
                'contents' => array_map(fn ($song) => $this->songRow($song, $siteUrl), $card['songs']),
            ],
            'footer' => $this->footer($this->hint($card, $inMultiPersonChat)),
        ];
    }

    private function cardTitle(array $card): string
    {
        if (! $card['hasPage']) {
            return $card['number'] === null
                ? '沒有頁碼的歌'
                : '沒有頁碼的歌（'.self::NO_PAGE_NUMERALS[$card['number']].'）';
        }

        $first = $card['songs'][0]['page'];
        $last = $card['songs'][count($card['songs']) - 1]['page'];

        return $first === $last ? "第 {$first} 頁" : "第 {$first}～{$last} 頁";
    }

    private function hint(array $card, bool $inMultiPersonChat): string
    {
        $first = $card['songs'][0];
        $subject = $card['hasPage'] ? '頁碼' : '歌名';
        $example = $card['hasPage'] ? $first['page'] : $first['title'];
        $prefix = $inMultiPersonChat ? '@Anood助理 加' : '輸入';

        return "{$prefix}{$subject}就可以點歌，例如 {$example}";
    }

    private function songRow(array $song, string $siteUrl): array
    {
        $title = ['type' => 'text', 'text' => $song['title'], 'size' => 'sm', 'wrap' => true, 'flex' => 5];
        $contents = $song['page'] === null
            ? [$title]
            : [['type' => 'text', 'text' => $song['page'], 'size' => 'sm', 'weight' => 'bold', 'color' => self::PAGE_COLOR, 'flex' => 1], $title];

        return [
            'type' => 'box',
            'layout' => 'horizontal',
            'spacing' => 'md',
            'action' => [
                'type' => 'uri',
                'label' => mb_substr($song['title'], 0, self::ACTION_LABEL_LIMIT),
                'uri' => "{$siteUrl}/songs/{$song['id']}",
            ],
            'contents' => $contents,
        ];
    }

    private function navBubble(int $omitted, string $subtitle, string $siteUrl): array
    {
        return [
            'type' => 'bubble',
            'header' => $this->header('更多歌曲', $subtitle, self::NAV_COLOR),
            'body' => [
                'type' => 'box',
                'layout' => 'vertical',
                'spacing' => 'md',
                'action' => ['type' => 'uri', 'label' => '開啟網站', 'uri' => "{$siteUrl}/"],
                'contents' => [
                    ['type' => 'text', 'text' => "還有 {$omitted} 首歌未列出，請到網站查看", 'size' => 'sm', 'wrap' => true],
                    ['type' => 'text', 'text' => "{$siteUrl}/", 'size' => 'xs', 'wrap' => true, 'color' => '#1A73E8'],
                ],
            ],
        ];
    }

    private function header(string $title, string $subtitle, string $color): array
    {
        return [
            'type' => 'box',
            'layout' => 'vertical',
            'backgroundColor' => $color,
            'paddingAll' => '12px',
            'contents' => [
                ['type' => 'text', 'text' => $title, 'weight' => 'bold', 'color' => '#FFFFFF'],
                ['type' => 'text', 'text' => $subtitle, 'size' => 'xs', 'color' => '#FFFFFF'],
            ],
        ];
    }

    private function footer(string $hint): array
    {
        return [
            'type' => 'box',
            'layout' => 'vertical',
            'backgroundColor' => '#F4F4F4',
            'contents' => [
                ['type' => 'text', 'text' => $hint, 'size' => 'xs', 'color' => '#555555', 'wrap' => true],
            ],
        ];
    }
}
