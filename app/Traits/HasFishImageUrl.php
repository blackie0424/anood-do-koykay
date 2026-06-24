<?php

namespace App\Traits;

use App\Services\FishService;

/**
 * HasFishImageUrl Trait
 * 
 * 提供共用方法來處理魚類圖片 URL 的指派
 * 減少 Controller 中重複的 assignImageUrls 呼叫
 */
trait HasFishImageUrl
{
    /**
     * 為單一魚類物件指派圖片 URL
     *
     * @param \App\Models\Fish $fish 魚類模型實例
     * @return \App\Models\Fish 已處理圖片 URL 的魚類實例
     */
    protected function assignFishImage($fish)
    {
        return $this->fishService->assignImageUrls([$fish])[0];
    }

    /**
     * 為多個魚類物件指派圖片 URL
     *
     * @param array|\Illuminate\Support\Collection $fishes 魚類集合
     * @return array 已處理圖片 URL 的魚類陣列
     */
    protected function assignFishImages($fishes)
    {
        $fishesArray = is_array($fishes) ? $fishes : $fishes->all();
        return $this->fishService->assignImageUrls($fishesArray);
    }
}
