<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Song;
use App\Models\SongScore;
use App\Services\OcrService;
use App\Services\StorageService;
use Illuminate\Http\Request;

class ScoreController extends Controller
{
    public function __construct(
        private OcrService $ocr,
        private StorageService $storage,
    ) {}

    public function store(Request $request, Song $song)
    {
        $request->validate([
            'score' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $nextOrder = $song->scores()->max('order') + 1;
        $path = $this->storage->uploadFile($request->file('score'), "scores/{$song->id}");

        $score = $song->scores()->create([
            'order' => $nextOrder,
            'image_url' => $path,
        ]);

        $ocrError = null;
        $ocrRaw = '';
        try {
            $result = $this->ocr->extractLines($request->file('score'), $song->title_native ?? '');
            $ocrRaw = $result['raw'];
            $score->update(['ocr_raw' => $ocrRaw]);

            $ocrLines = $result['lines'] ?? [];
            if (!empty($ocrLines)) {
                $maxOrder = $song->lines()->max('order') ?? 0;
                foreach ($ocrLines as $line) {
                    $song->lines()->create([
                        'order'       => $maxOrder + $line['order'],
                        'text_native' => $line['text_native'],
                        'text_zh'     => $line['text_zh'] ?? '',
                        'start_time'  => null,
                        'end_time'    => null,
                    ]);
                }
            }
        } catch (\RuntimeException $e) {
            $ocrError = $e->getMessage();
        }

        return response()->json([
            'score' => $score,
            'ocr_error' => $ocrError,
        ]);
    }

    public function destroy(Song $song, SongScore $score)
    {
        abort_if($score->song_id !== $song->id, 404);
        $score->delete();
        return response()->json(['message' => '已刪除']);
    }

    public function reorder(Request $request, Song $song)
    {
        $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer'],
        ]);

        foreach ($request->input('order') as $position => $scoreId) {
            $song->scores()->where('id', $scoreId)->update(['order' => $position + 1]);
        }

        return response()->json(['message' => '排序已更新']);
    }

    public function reOcr(Song $song, SongScore $score)
    {
        abort_if($score->song_id !== $song->id, 404);

        $result = $this->ocr->extractLinesFromUrl($score->image_url, $song->title_native ?? '');
        $score->update(['ocr_raw' => $result['raw']]);

        return response()->json(['ocr_raw' => $result['raw']]);
    }
}
