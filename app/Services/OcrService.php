<?php
namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OcrService
{
    public function extractLines(UploadedFile $file): array
    {
        $apiKey = config('services.google.vision_api_key');

        if (!$apiKey) {
            Log::warning('Google Vision API key not configured');
            return ['raw' => '', 'lines' => []];
        }

        $base64 = base64_encode(file_get_contents($file->getRealPath()));

        $response = Http::post("https://vision.googleapis.com/v1/images:annotate?key={$apiKey}", [
            'requests' => [[
                'image' => ['content' => $base64],
                'features' => [['type' => 'TEXT_DETECTION']],
            ]],
        ]);

        if (!$response->successful()) {
            Log::error('OCR request failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('OCR 辨識失敗（HTTP ' . $response->status() . '），請確認 Google Vision API 權限');
        }

        $text = $response->json('responses.0.fullTextAnnotation.text', '');
        return ['raw' => $text, 'lines' => $this->parseLines($text)];
    }

    private function parseLines(string $text): array
    {
        $raw = array_values(array_filter(array_map('trim', explode("\n", $text))));
        $lines = [];
        $order = 1;

        foreach ($raw as $line) {
            if ($this->isNotationOrChordLine($line)) {
                continue;
            }

            $lines[] = [
                'order' => $order++,
                'text_native' => $line,
                'text_zh' => '',
            ];
        }

        return $lines;
    }

    private function isNotationOrChordLine(string $line): bool
    {
        // 簡譜數字行：只含數字 0-7、空格、連字號、點、|
        if (preg_match('/^[\d\s\-\.\|]+$/', $line)) {
            return true;
        }

        // 和弦行：只含大寫字母、數字、#、b、/、空格（如 C Am7 G/B）
        if (preg_match('/^[A-G][A-Za-z0-9#b\/\s]*$/', $line) && strlen($line) <= 20) {
            return true;
        }

        return false;
    }
}
