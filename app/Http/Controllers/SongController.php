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
            ->paginate(20);
        return Inertia::render('SongList', ['songs' => $songs]);
    }

    public function showPage(Song $song)
    {
        abort_if($song->status !== 'published', 404);
        $song->load('lines');
        return Inertia::render('SongPlayer', ['song' => $song]);
    }

    public function readerPage(Song $song)
    {
        abort_if($song->status !== 'published', 404);
        $song->load('lines');
        return Inertia::render('SongReader', ['song' => $song]);
    }

    public function index(Request $request)
    {
        $query = Song::where('status', 'published')
            ->select('id', 'title_native', 'title_zh', 'audio_full', 'book_number')
            ->orderByRaw('book_number IS NULL ASC')
            ->orderByRaw('CAST(book_number AS UNSIGNED) ASC')
            ->orderBy('id');

        $keyword = trim((string) $request->query('q', ''));

        if ($keyword !== '') {
            $query->where(function ($q) use ($keyword) {
                $q->where('book_number', 'like', "%{$keyword}%")
                    ->orWhere('title_native', 'like', "%{$keyword}%")
                    ->orWhere('title_zh', 'like', "%{$keyword}%");
            });

            return response()->json($query->paginate(100));
        }

        return response()->json($query->paginate(20));
    }

    public function show(Song $song)
    {
        abort_if($song->status !== 'published', 404);
        $song->load('lines');
        return response()->json($song);
    }
}
