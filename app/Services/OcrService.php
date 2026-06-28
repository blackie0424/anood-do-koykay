<?php
namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OcrService
{
    public function extractLines(UploadedFile $file, string $titleNative = ''): array
    {
        $apiKey = config('services.google.vision_api_key');

        if (!$apiKey) {
            Log::warning('Google Vision API key not configured');
            return ['raw' => '', 'lines' => []];
        }

        $base64 = base64_encode(file_get_contents($file->getRealPath()));

        return $this->callApi(['content' => $base64]);
    }

    public function extractLinesFromUrl(string $url, string $titleNative = ''): array
    {
        $apiKey = config('services.google.vision_api_key');

        if (!$apiKey) {
            Log::warning('Google Vision API key not configured');
            return ['raw' => '', 'lines' => []];
        }

        return $this->callApi(['source' => ['imageUri' => $url]]);
    }

    private function callApi(array $image): array
    {
        $apiKey = config('services.google.vision_api_key');

        $response = Http::post("https://vision.googleapis.com/v1/images:annotate?key={$apiKey}", [
            'requests' => [[
                'image' => $image,
                'features' => [['type' => 'DOCUMENT_TEXT_DETECTION']],
            ]],
        ]);

        if (!$response->successful()) {
            Log::error('OCR request failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('OCR 辨識失敗（HTTP ' . $response->status() . '），請確認 Google Vision API 權限');
        }

        $annotations = $response->json('responses.0.textAnnotations', []);
        $grouped = $this->groupByYCoordinate($annotations);

        return ['raw' => implode("\n", $grouped), 'lines' => $this->parseLines($grouped)];
    }

    private function groupByYCoordinate(array $annotations): array
    {
        if (empty($annotations)) {
            return [];
        }

        $words = array_slice($annotations, 1);
        $groups = [];

        foreach ($words as $word) {
            $y = $word['boundingPoly']['vertices'][0]['y'] ?? 0;
            $matched = false;
            foreach ($groups as &$group) {
                if (abs($group['y'] - $y) <= 15) {
                    $group['words'][] = $word['description'];
                    $matched = true;
                    break;
                }
            }
            unset($group);
            if (!$matched) {
                $groups[] = ['y' => $y, 'words' => [$word['description']]];
            }
        }

        usort($groups, fn($a, $b) => $a['y'] <=> $b['y']);

        return array_map(fn($g) => implode(' ', $g['words']), $groups);
    }

    private function parseLines(array $lines): array
    {
        $result = [];
        $order = 1;

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }
            if ($this->isNotationOrChordLine($line)) {
                continue;
            }
            $result[] = [
                'order' => $order++,
                'text_native' => $line,
                'text_zh' => '',
            ];
        }

        return $result;
    }

    private function isNotationOrChordLine(string $line): bool
    {
        if (preg_match('/^[\d\s\-\.\|·•:]+$/', $line)) {
            return true;
        }

        $tokens = array_values(array_filter(preg_split('/\s+/', trim($line))));
        $total = count($tokens);
        if ($total === 0) return false;

        $chordCount = 0;
        $numericCount = 0;
        foreach ($tokens as $token) {
            if ($this->isChordToken($token)) {
                $chordCount++;
            } elseif (preg_match('/^\d+$/', $token)) {
                $numericCount++;
            }
        }

        if ($chordCount / $total > 0.6) return true;
        if ($numericCount / $total > 0.4) return true;

        return false;
    }

    private function isChordToken(string $token): bool
    {
        return (bool) preg_match('/^[A-G](m|maj|dim|aug|min)?(maj7|m7|dim7|mmaj7|7|9|11|13|6|sus2|sus4|add9|add2)?(#|b)?(\/[A-G])?$/', $token);
    }
}
