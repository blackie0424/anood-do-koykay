<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Song;
use App\Models\SongScore;
use App\Services\OcrService;
use App\Services\StorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BatchImportController extends Controller
{
    public function __construct(
        private OcrService $ocr,
        private StorageService $storage,
    ) {}

    public function page(): \Inertia\Response
    {
        return Inertia::render('Admin/BatchImport');
    }

    public function ocrToc(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'images'   => 'required|array|min:1|max:4',
            'images.*' => 'required|image|max:10240',
        ]);

        $allLines = [];
        foreach ($request->file('images') as $image) {
            $result = $this->ocr->extractLines($image);
            $rawLines = array_filter(explode("\n", $result['raw']), fn($l) => trim($l) !== '');
            array_push($allLines, ...$rawLines);
        }

        $entries = $this->parseToc($allLines);

        return response()->json(['entries' => $entries]);
    }

    public function uploadScores(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'images'   => 'required|array|min:1|max:30',
            'images.*' => 'required|image|max:20480',
            'pages'    => 'required|array|min:1|max:30',
            'pages.*'  => 'required|integer|min:1',
        ]);

        $results = [];
        foreach ($request->file('images') as $i => $image) {
            $url = $this->storage->uploadFile($image, 'scores');
            $results[] = ['page' => $request->input("pages.{$i}"), 'url' => $url];
        }

        return response()->json(['uploads' => $results]);
    }

    public function createSongs(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'songs'              => 'required|array|min:1',
            'songs.*.title'      => 'required|string|max:255',
            'songs.*.start_page' => 'required|integer|min:1',
            'songs.*.end_page'   => 'required|integer|min:1',
            'score_urls'         => 'required|array',
            'score_urls.*.page'  => 'required|integer|min:1',
            'score_urls.*.url'   => 'required|url',
        ]);

        $urlMap = collect($request->input('score_urls'))->keyBy('page');
        $created = 0;

        DB::transaction(function () use ($request, $urlMap, &$created) {
            foreach ($request->input('songs') as $entry) {
                $song = Song::create([
                    'title_native' => $entry['title'],
                    'book_number'  => (string) $entry['start_page'],
                    'status'       => 'pending_review',
                ]);

                $order = 1;
                for ($page = $entry['start_page']; $page <= $entry['end_page']; $page++) {
                    if (!$urlMap->has($page)) continue;

                    $score = $song->scores()->create([
                        'image_url' => $urlMap[$page]['url'],
                        'order'     => $order++,
                    ]);

                    $this->triggerOcr($song, $score);
                }

                $created++;
            }
        });

        return response()->json(['created' => $created]);
    }

    private function triggerOcr(Song $song, SongScore $score): void
    {
        try {
            $result = $this->ocr->extractLinesFromUrl($score->image_url, $song->title_native);
            $score->update(['ocr_raw' => $result['raw']]);

            if (!empty($result['lines']) && $song->lines()->count() === 0) {
                $song->lines()->createMany($result['lines']);
            }
        } catch (\Throwable) {
            // OCR 失敗不阻斷匯入，待人工補充
        }
    }

    private function parseToc(array $lines): array
    {
        $entries = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if (!$line) continue;

            // 嘗試從行末萃取頁碼（數字，前面可能有點或空格）
            if (preg_match('/^(.+?)[.\s·]+(\d+)\s*$/', $line, $m)) {
                $title = trim($m[1]);
                $page  = (int) $m[2];
                if ($title && $page > 0) {
                    $entries[] = ['title' => $title, 'page' => $page];
                }
            }
        }

        return $entries;
    }
}
