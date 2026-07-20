<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SongReport extends Model
{
    use HasFactory;
    protected $fillable = ['song_id', 'report_type', 'note', 'resolved'];

    protected $casts = [
        'resolved' => 'boolean',
    ];

    public function song()
    {
        return $this->belongsTo(Song::class);
    }
}
