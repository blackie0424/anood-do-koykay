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

        return response()->json(['entries' => $this->parseToc($allLines)]);
    }

    public function createSongs(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'songs'              => 'required|array|min:1',
            'songs.*.title'      => 'required|string|max:255',
            'songs.*.start_page' => 'required|integer|min:1',
        ]);

        $created = 0;

        DB::transaction(function () use ($request, &$created) {
            foreach ($request->input('songs') as $entry) {
                Song::create([
                    'title_native' => $entry['title'],
                    'book_number'  => (string) $entry['start_page'],
                    'status'       => 'pending_review',
                ]);
                $created++;
            }
        });

        return response()->json(['created' => $created]);
    }

    public function uploadScoreByPage(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:20480',
            'page'  => 'required|integer|min:1',
        ]);

        $url   = $this->storage->uploadFile($request->file('image'), 'scores');
        $songs = Song::where('book_number', (string) $request->integer('page'))
            ->get(['id', 'title_native']);

        if ($songs->isEmpty()) {
            return response()->json([
                'url'           => $url,
                'matched_songs' => [],
                'auto_attached' => false,
            ]);
        }

        if ($songs->count() === 1) {
            $song  = $songs->first();
            $score = $song->scores()->create([
                'image_url' => $url,
                'order'     => $song->scores()->count() + 1,
            ]);
            $this->triggerOcr($song, $score);

            return response()->json([
                'url'           => $url,
                'matched_songs' => [['id' => $song->id, 'title_native' => $song->title_native]],
                'auto_attached' => true,
            ]);
        }

        return response()->json([
            'url'           => $url,
            'matched_songs' => $songs->map(fn($s) => ['id' => $s->id, 'title_native' => $s->title_native]),
            'auto_attached' => false,
        ]);
    }

    public function attachScore(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'song_id' => 'required|integer|exists:songs,id',
            'url'     => 'required|url',
        ]);

        $song  = Song::findOrFail($request->integer('song_id'));
        $score = $song->scores()->create([
            'image_url' => $request->input('url'),
            'order'     => $song->scores()->count() + 1,
        ]);
        $this->triggerOcr($song, $score);

        return response()->json(['attached' => true]);
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
            // OCR 失敗不阻斷，待人工補充
        }
    }

    private function parseToc(array $lines): array
    {
        $entries = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if (!$line) continue;

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
