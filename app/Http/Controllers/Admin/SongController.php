<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Song;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SongController extends Controller
{
    public function indexPage()
    {
        $songs = Song::select('id', 'title_native', 'title_zh', 'status', 'created_at')
            ->orderByDesc('id')->get();
        return Inertia::render('Admin/Songs', ['songs' => $songs]);
    }

    public function createPage()
    {
        return Inertia::render('Admin/SongEdit', ['song' => null]);
    }

    public function editPage(Song $song)
    {
        return Inertia::render('Admin/SongEdit', ['song' => $song->only('id', 'title_native', 'title_zh', 'status', 'show_zh_lyrics', 'book_number')]);
    }

    public function mediaPage(Song $song)
    {
        $song->load('scores');
        return Inertia::render('Admin/SongMedia', [
            'song' => array_merge(
                $song->only('id', 'title_native', 'score_image', 'audio_full', 'audio_start', 'audio_end'),
                ['scores' => $song->scores]
            ),
        ]);
    }

    public function lyricsPage(Song $song)
    {
        $song->load('lines', 'scores');
        return Inertia::render('Admin/SongLyrics', [
            'song' => array_merge(
                $song->only('id', 'title_native', 'title_zh', 'audio_full', 'audio_start', 'audio_end'),
                ['lines' => $song->lines, 'scores' => $song->scores]
            ),
        ]);
    }

    public function index()
    {
        return response()->json(
            Song::select('id', 'title_native', 'title_zh', 'status', 'created_at')
                ->orderByDesc('id')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title_native' => ['required', 'string', 'max:255'],
            'title_zh' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:draft,published'],
        ]);
        return response()->json(Song::create($data), 201);
    }

    public function show(Song $song)
    {
        return response()->json($song->load('lines'));
    }

    public function update(Request $request, Song $song)
    {
        $data = $request->validate([
            'title_native' => ['sometimes', 'string', 'max:255'],
            'title_zh' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:draft,published'],
            'show_zh_lyrics' => ['sometimes', 'boolean'],
            'book_number' => ['nullable', 'string', 'max:20'],
            'audio_start' => ['nullable', 'numeric', 'min:0'],
            'audio_end' => ['nullable', 'numeric', 'min:0'],
        ]);
        $song->update($data);
        return response()->json($song);
    }

    public function destroy(Song $song)
    {
        $song->delete();
        return response()->json(['message' => '已刪除']);
    }
}
