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

    /**
     * Group word annotations by y-coordinate (within 10px = same line).
     * Returns array of line strings sorted by y position.
     */
    private function groupByYCoordinate(array $annotations): array
    {
        if (empty($annotations)) {
            return [];
        }

        // Skip index 0 (full text annotation)
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

    private function filterRawText(array $lines): string
    {
        $kept = array_filter($lines, function (string $line) {
            if (preg_match('/[A-Za-z]/', $line)) {
                if (preg_match('/^[A-G][A-Za-z0-9#b\/\s]*$/', trim($line)) && strlen(trim($line)) <= 20) {
                    return false;
                }
                return true;
            }
            if (preg_match('/[\x{4e00}-\x{9fff}]/u', $line)) {
                return true;
            }
            return false;
        });
        return implode("\n", $kept);
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
        if (preg_match('/^[\d\s\-\.\|]+$/', $line)) {
            return true;
        }
        if (preg_match('/^[A-G][A-Za-z0-9#b\/\s]*$/', $line) && strlen($line) <= 20) {
            return true;
        }
        return false;
    }
}
