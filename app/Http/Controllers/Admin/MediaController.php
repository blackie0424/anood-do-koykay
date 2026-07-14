<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Song;
use App\Services\OcrService;
use App\Services\StorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MediaController extends Controller
{
    public function __construct(
        private OcrService $ocr,
        private StorageService $storage,
    ) {}

    public function uploadScore(Request $request, Song $song)
    {
        $request->validate([
            'score' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $path = $this->storage->uploadFile($request->file('score'), "scores/{$song->id}");
        $song->update(['score_image' => $path]);

        $ocrError = null;
        $result = ['raw' => '', 'lines' => []];
        try {
            $result = $this->ocr->extractLines($request->file('score'), $song->title_native ?? '');
            $song->update(['ocr_raw' => $result['raw']]);
            if (!empty($result['lines'])) {
                DB::transaction(function () use ($song, $result) {
                    $song->lines()->delete();
                    foreach ($result['lines'] as $line) {
                        $song->lines()->create($line);
                    }
                });
            }
        } catch (\RuntimeException $e) {
            $ocrError = $e->getMessage();
        }

        return response()->json([
            'score_image' => $path,
            'lines_draft' => $result['lines'],
            'ocr_error' => $ocrError,
        ]);
    }

    public function reOcr(Song $song)
    {
        if (!$song->score_image) {
            return response()->json(['error' => '尚未上傳樂譜'], 422);
        }
        $result = $this->ocr->extractLinesFromUrl($song->score_image, $song->title_native ?? '');
        $song->update(['ocr_raw' => $result['raw']]);
        if (!empty($result['lines'])) {
            DB::transaction(function () use ($song, $result) {
                $song->lines()->delete();
                foreach ($result['lines'] as $line) {
                    $song->lines()->create($line);
                }
            });
        }
        return response()->json(['ocr_raw' => $result['raw'], 'lines' => $result['lines']]);
    }

    public function uploadAudio(Request $request, Song $song)
    {
        $request->validate([
            'audio' => ['required', 'file', 'mimetypes:audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,audio/x-aac,audio/mp3', 'max:81920'],
            'type' => ['required', 'in:full,line'],
            'line_id' => ['nullable', 'integer', 'exists:song_lines,id'],
            'duration' => ['nullable', 'numeric', 'min:0'],
        ]);

        $folder = $request->input('type') === 'full'
            ? "audio/full/{$song->id}"
            : "audio/lines/{$song->id}";

        $path = $this->storage->uploadFile($request->file('audio'), $folder);

        if ($request->input('type') === 'full') {
            $updates = ['audio_full' => $path];
            if ($request->filled('duration')) {
                $updates['audio_duration'] = (int) round((float) $request->input('duration'));
            }
            $song->update($updates);
        } else {
            $song->lines()->where('id', $request->input('line_id'))->update(['audio_line' => $path]);
        }

        return response()->json(['path' => $path]);
    }
}
