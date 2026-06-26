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

        $response = Http::post("https://vision.googleapis.com/v1/images:annotate?key={$apiKey}", [
            'requests' => [[
                'image' => ['content' => $base64],
                'features' => [['type' => 'DOCUMENT_TEXT_DETECTION']],
            ]],
        ]);

        if (!$response->successful()) {
            Log::error('OCR request failed', ['status' => $response->status(), 'body' => $response->body()]);
            throw new \RuntimeException('OCR 辨識失敗（HTTP ' . $response->status() . '），請確認 Google Vision API 權限');
        }

        $annotations = $response->json('responses.0.textAnnotations', []);
        $grouped = $this->groupByYCoordinate($annotations);

        return ['raw' => implode("\n", $grouped), 'lines' => $this->parseLines($grouped, $titleNative)];
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

    private function parseLines(array $lines, string $titleNative = ''): array
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
            if ($titleNative && str_contains(strtolower($line), strtolower($titleNative))) {
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
        // 純數字/符號行
        if (preg_match('/^[\d\s\-\.\|·•]+$/', $line)) {
            return true;
        }

        // 和弦行：每個 token（以空格分隔）都符合標準和弦格式，且 token 數 ≤ 6
        $tokens = preg_split('/\s+/', trim($line));
        if (count($tokens) > 0 && count($tokens) <= 6 &&
            array_reduce($tokens, fn($carry, $t) => $carry && $this->isChordToken($t), true)) {
            return true;
        }

        return false;
    }

    private function isChordToken(string $token): bool
    {
        return (bool) preg_match('/^[A-G][m]?[0-9]?(#|b)?(\/[A-G])?$/', $token);
    }
}
