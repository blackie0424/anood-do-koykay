<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Song extends Model
{
    use HasFactory;

    protected $fillable = ['title_native', 'title_zh', 'score_image', 'audio_full', 'audio_start', 'audio_end', 'status', 'ocr_raw', 'book_number'];

    public function lines()
    {
        return $this->hasMany(SongLine::class)->orderBy('order');
    }

    public function scores()
    {
        return $this->hasMany(SongScore::class)->orderBy('order');
    }
}
