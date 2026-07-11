<?php

namespace App\Http\Controllers;

use App\Models\Song;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SongController extends Controller
{
    public function indexPage()
    {
        $songs = Song::where('status', 'published')
            ->select('id', 'title_native', 'title_zh', 'audio_full', 'book_number')
            ->orderByRaw('book_number IS NULL ASC')
            ->orderByRaw('CAST(book_number AS UNSIGNED) ASC')
            ->orderBy('id')
            ->get();
        return Inertia::render('SongList', ['songs' => $songs]);
    }

    public function showPage(Song $song)
    {
        abort_if($song->status !== 'published', 404);
        $song->load('lines');
        return Inertia::render('SongPlayer', ['song' => $song]);
    }

    public function index()
    {
        return response()->json(
            Song::where('status', 'published')
                ->select('id', 'title_native', 'title_zh', 'audio_full', 'status', 'book_number')
                ->orderByRaw('book_number IS NULL ASC')
                ->orderByRaw('CAST(book_number AS UNSIGNED) ASC')
                ->orderBy('id')
                ->get()
        );
    }

    public function show(Song $song)
    {
        abort_if($song->status !== 'published', 404);
        $song->load('lines');
        return response()->json($song);
    }
}
