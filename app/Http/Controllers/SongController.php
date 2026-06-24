<?php
namespace App\Http\Controllers;

use App\Models\Song;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SongController extends Controller
{
    public function index()
    {
        $songs = Song::where('status', 'published')
            ->select('id', 'title_native', 'title_zh', 'audio_full', 'status')
            ->orderBy('id')
            ->get();

        return response()->json($songs);
    }

    public function show(Song $song)
    {
        if ($song->status !== 'published') {
            return response()->json(['message' => '找不到歌曲'], 404);
        }

        $song->load('lines');
        return response()->json($song);
    }

    public function indexPage()
    {
        $songs = Song::where('status', 'published')
            ->select('id', 'title_native', 'title_zh', 'audio_full')
            ->orderBy('id')
            ->get();
        return Inertia::render('SongList', ['songs' => $songs]);
    }

    public function showPage(Song $song)
    {
        if ($song->status !== 'published') {
            abort(404);
        }
        $song->load('lines');
        return Inertia::render('SongPlayer', ['song' => $song]);
    }
}
