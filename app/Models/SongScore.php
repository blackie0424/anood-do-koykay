<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SongScore extends Model
{
    use HasFactory;

    protected $fillable = ['song_id', 'order', 'image_url', 'ocr_raw'];

    public function song()
    {
        return $this->belongsTo(Song::class);
    }
}
