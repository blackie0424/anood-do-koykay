<?php

namespace App\Contracts;

/**
 * FishStatisticsServiceInterface
 *
 * 定義魚類統計服務的公開合約。
 * 遵循 SOLID 的依賴反轉原則（DIP），控制器與報告功能
 * 僅依賴此介面，不直接依賴具體實作。
 */
interface FishStatisticsServiceInterface
{
    /**
     * 取得所有魚類統計資料，供量化報告使用。
     *
     * @return array{
     *   total_fish: int,
     *   food_categories_by_tribe: array<string, array<string, int>>,
     *   capture_methods_by_tribe: array<string, array<string, int>>,
         *   processing_methods: array<string, int>,
         *   processing_methods_by_tribe: array<string, array<string, int>>
     * }
     */
    public function getStatistics(): array;
}
