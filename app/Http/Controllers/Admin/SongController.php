<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Song;
use App\Services\StorageService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SongController extends Controller
{
    public function __construct(private StorageService $storage) {}

    public function index()
    {
        $songs = Song::select('id', 'title_native', 'title_zh', 'status', 'created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json($songs);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title_native' => ['required', 'string', 'max:255'],
            'title_zh' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:draft,published'],
        ]);

        $song = Song::create($data);
        return response()->json($song, 201);
    }

    public function show(Song $song)
    {
        $song->load('lines');
        return response()->json($song);
    }

    public function update(Request $request, Song $song)
    {
        $data = $request->validate([
            'title_native' => ['sometimes', 'string', 'max:255'],
            'title_zh' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:draft,published'],
        ]);

        $song->update($data);
        return response()->json($song);
    }

    public function destroy(Song $song)
    {
        $song->delete();
        return response()->json(['message' => '已刪除']);
    }

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
        $song->load('lines');
        return Inertia::render('Admin/SongEdit', ['song' => $song]);
    }
}
