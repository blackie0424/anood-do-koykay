<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SongLine extends Model
{
    use HasFactory;

    protected $fillable = ['song_id', 'order', 'text_native', 'text_zh', 'start_time', 'end_time', 'audio_line'];

    public function song()
    {
        return $this->belongsTo(Song::class);
    }
}
