<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SongReport extends Model
{
    protected $fillable = ['song_id', 'report_type', 'note', 'resolved'];

    protected $casts = [
        'resolved' => 'boolean',
    ];

    public function song()
    {
        return $this->belongsTo(Song::class);
    }
}
