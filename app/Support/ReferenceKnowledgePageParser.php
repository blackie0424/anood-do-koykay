<?php

namespace App\Support;

class ReferenceKnowledgePageParser
{
    /**
     * @return array{start: int|null, end: int|null}
     */
    public static function parse(?string $pages): array
    {
        if ($pages === null || trim($pages) === '') {
            return ['start' => null, 'end' => null];
        }

        preg_match_all('/(\d+)(?:\s*-\s*(\d+))?/', $pages, $matches, PREG_SET_ORDER);

        if ($matches === []) {
            return ['start' => null, 'end' => null];
        }

        $ranges = array_map(static function (array $match): array {
            $start = (int) $match[1];
            $end = isset($match[2]) && $match[2] !== '' ? (int) $match[2] : $start;

            return [
                'start' => min($start, $end),
                'end' => max($start, $end),
            ];
        }, $matches);

        return [
            'start' => min(array_column($ranges, 'start')),
            'end' => max(array_column($ranges, 'end')),
        ];
    }
}
