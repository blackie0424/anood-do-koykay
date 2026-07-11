<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SongFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title_native' => fake()->words(3, true),
            'title_zh' => fake()->words(3, true),
            'score_image' => null,
            'audio_full' => null,
            'audio_start' => null,
            'audio_end' => null,
            'status' => 'draft',
            'show_zh_lyrics' => false,
        ];
    }

    public function published(): static
    {
        return $this->state(['status' => 'published']);
    }
}
