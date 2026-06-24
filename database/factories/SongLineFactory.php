<?php

namespace Database\Factories;

use App\Models\Song;
use Illuminate\Database\Eloquent\Factories\Factory;

class SongLineFactory extends Factory
{
    public function definition(): array
    {
        static $order = 0;
        $order++;

        return [
            'song_id' => Song::factory(),
            'order' => $order,
            'text_native' => fake()->sentence(4),
            'text_zh' => fake()->sentence(4),
            'start_time' => ($order - 1) * 3.5,
            'end_time' => $order * 3.5,
            'audio_line' => null,
        ];
    }
}
