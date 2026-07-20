<?php

namespace Database\Factories;

use App\Models\Song;
use Illuminate\Database\Eloquent\Factories\Factory;

class SongReportFactory extends Factory
{
    public function definition(): array
    {
        return [
            'song_id'     => Song::factory(),
            'report_type' => fake()->randomElement(['lyrics_timing', 'lyrics_text_error', 'audio_not_playing', 'other']),
            'note'        => null,
            'resolved'    => false,
        ];
    }
}
