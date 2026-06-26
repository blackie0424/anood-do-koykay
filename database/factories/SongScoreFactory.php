<?php

namespace Database\Factories;

use App\Models\Song;
use Illuminate\Database\Eloquent\Factories\Factory;

class SongScoreFactory extends Factory
{
    public function definition(): array
    {
        return [
            'song_id' => Song::factory(),
            'order' => 1,
            'image_url' => 'https://example.com/score.png',
            'ocr_raw' => null,
        ];
    }
}
