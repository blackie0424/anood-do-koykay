<?php

namespace App\Http\Controllers;

use App\Models\Song;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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
        return Inertia::render('SongList', ['songs' => $this->paginatorToArray($songs)]);
    }

    public function showPage(Request $request, Song $song)
    {
        abort_if($song->status !== 'published', 404);
        $song->load('lines');

        return Inertia::render('SongPlayer', [
            'song' => $song,
            // 用 X-Inertia 這個 header 判斷這次請求是不是 Inertia 前端內部
            // 導覽送出來的（一定會帶這個 header），還是瀏覽器真的整頁載入
            // （一定不會帶）。純診斷用，不影響任何行為。
            'isColdLoad' => !$request->hasHeader('X-Inertia'),
            'showDiagnostics' => config('app.player_diagnostics'),
        ]);
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

            return response()->json($this->paginatorToArray($query->paginate(100)));
        }

        return response()->json($this->paginatorToArray($query->paginate(20)));
    }

    private function paginatorToArray(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => $paginator->items(),
            'links' => [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'path' => $paginator->path(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
        ];
    }

    public function show(Song $song)
    {
        abort_if($song->status !== 'published', 404);
        $song->load('lines');
        return response()->json($song);
    }
}
