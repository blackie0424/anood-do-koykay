<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FishResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $groupedClassifications = $this->tribalClassifications
            ->groupBy('food_category')
            ->map(function ($group) {
                return $group->pluck('tribe')->toArray();
            })->mapWithKeys(function ($item, $key) {
                $newKey = $key;
                switch ($key) {
                    case '不食用':
                        $newKey = 'notEdible';
                        break;
                    case '?':
                        $newKey = 'uncertain';
                        break;
                    case '不分類':
                        $newKey = 'unclassified';
                        break;
                }
                return [$newKey => $item ?: []];
            });

        return [
            'fish_id' => $this->id,
            'name' => $this->name,
            'image_url' => $this->image_url,
            'audio_url' => $this->audio_url,
            'oyod' => implode(',', $groupedClassifications->get('oyod', [])),
            'rahet' => implode(',', $groupedClassifications->get('rahet', [])),
            'notEdible' => implode(',', $groupedClassifications->get('notEdible', [])),
            'uncertain' => implode(',', $groupedClassifications->get('uncertain', [])),
            'unclassified' => implode(',', $groupedClassifications->get('unclassified', [])),
        ];
    }
}
