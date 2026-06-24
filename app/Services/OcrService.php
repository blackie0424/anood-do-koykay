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
            return [];
        }

        $base64 = base64_encode(file_get_contents($file->getRealPath()));

        $response = Http::post("https://vision.googleapis.com/v1/images:annotate?key={$apiKey}", [
            'requests' => [[
                'image' => ['content' => $base64],
                'features' => [['type' => 'TEXT_DETECTION']],
            ]],
        ]);

        if (!$response->successful()) {
            Log::error('OCR request failed', ['status' => $response->status()]);
            return [];
        }

        $text = $response->json('responses.0.fullTextAnnotation.text', '');
        return $this->parseLines($text);
    }

    private function parseLines(string $text): array
    {
        $raw = array_values(array_filter(array_map('trim', explode("\n", $text))));
        $lines = [];

        foreach ($raw as $i => $line) {
            $lines[] = [
                'order' => $i + 1,
                'text_native' => $line,
                'text_zh' => '',
            ];
        }

        return $lines;
    }
}
