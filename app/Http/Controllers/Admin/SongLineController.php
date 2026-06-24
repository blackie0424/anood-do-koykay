<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Song;
use App\Models\SongLine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SongLineController extends Controller
{
    public function batchStore(Request $request, Song $song)
    {
        $data = $request->validate([
            'lines' => ['required', 'array'],
            'lines.*.order' => ['required', 'integer', 'min:1'],
            'lines.*.text_native' => ['nullable', 'string'],
            'lines.*.text_zh' => ['nullable', 'string'],
            'lines.*.start_time' => ['nullable', 'numeric', 'min:0'],
            'lines.*.end_time' => ['nullable', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($song, $data) {
            $song->lines()->delete();
            foreach ($data['lines'] as $line) {
                $song->lines()->create($line);
            }
        });

        return response()->json($song->fresh()->load('lines'));
    }

    public function markTime(Request $request, Song $song, SongLine $line)
    {
        $data = $request->validate([
            'start_time' => ['required', 'numeric', 'min:0'],
            'end_time' => ['required', 'numeric', 'min:0'],
        ]);
        $line->update($data);
        return response()->json($line);
    }
}
