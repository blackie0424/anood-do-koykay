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

        // LINE App 用 openExternalBrowser 這個參數觸發「改用外部瀏覽器開
        // 啟」，切換這件事發生在 LINE App 自己那端，跟我們的伺服器無關；
        // 但外部瀏覽器（Safari）真的打進來時，網址上還留著這個參數，直接
        // 讓它留在網址上會污染 Inertia 的前端路由狀態，這裡先轉址清掉。
        if ($request->has('openExternalBrowser')) {
            $query = $request->except('openExternalBrowser');
            $url = $request->url().(empty($query) ? '' : '?'.http_build_query($query));
            return redirect($url);
        }

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
