<?php

namespace Tests\Unit;

use App\Services\OcrService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OcrServiceTest extends TestCase
{
    private OcrService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new OcrService();
    }

    public function test_returns_empty_raw_and_lines_when_api_key_not_configured(): void
    {
        Config::set('services.google.vision_api_key', null);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file);

        $this->assertSame(['raw' => '', 'lines' => []], $result);
    }

    public function test_groups_words_by_y_coordinate_into_lines(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        // Three words on same line (y=100), one on different line (y=150)
        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'textAnnotations' => [
                        // index 0 = full text (skipped)
                        ['description' => 'FULL_TEXT', 'boundingPoly' => ['vertices' => [['x' => 0, 'y' => 0]]]],
                        // line 1: y≈100
                        ['description' => 'ko', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 100]]]],
                        ['description' => 'tey-kak', 'boundingPoly' => ['vertices' => [['x' => 50, 'y' => 102]]]],
                        ['description' => 'za', 'boundingPoly' => ['vertices' => [['x' => 120, 'y' => 99]]]],
                        // line 2: y≈150
                        ['description' => 'ma-i', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 150]]]],
                        ['description' => 'ka-na', 'boundingPoly' => ['vertices' => [['x' => 60, 'y' => 152]]]],
                    ],
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file);

        $lines = explode("\n", trim($result['raw']));
        $this->assertCount(2, $lines);
        $this->assertSame('ko tey-kak za', $lines[0]);
        $this->assertSame('ma-i ka-na', $lines[1]);
    }

    public function test_skips_line_matching_song_title(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'textAnnotations' => [
                        ['description' => 'FULL_TEXT', 'boundingPoly' => ['vertices' => [['x' => 0, 'y' => 0]]]],
                        // title line y≈50
                        ['description' => 'Apen', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 50]]]],
                        ['description' => 'mo', 'boundingPoly' => ['vertices' => [['x' => 60, 'y' => 51]]]],
                        // lyrics line y≈100
                        ['description' => 'ko', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 100]]]],
                        ['description' => 'tey-kak', 'boundingPoly' => ['vertices' => [['x' => 50, 'y' => 101]]]],
                    ],
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file, 'Apen mo');

        // lines should not contain title
        $textNatives = array_column($result['lines'], 'text_native');
        $this->assertNotContains('Apen mo', $textNatives);
        $this->assertContains('ko tey-kak', $textNatives);
    }

    public function test_raw_text_filters_out_symbol_and_number_only_lines(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'textAnnotations' => [
                        ['description' => 'FULL_TEXT', 'boundingPoly' => ['vertices' => [['x' => 0, 'y' => 0]]]],
                        // CJK line y≈40
                        ['description' => '一切歌頌讚美', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 40]]]],
                        // Latin line y≈80
                        ['description' => 'ko', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 80]]]],
                        ['description' => 'tey-kak', 'boundingPoly' => ['vertices' => [['x' => 50, 'y' => 81]]]],
                        // symbol-only line y≈120
                        ['description' => '3', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 120]]]],
                        ['description' => '3', 'boundingPoly' => ['vertices' => [['x' => 30, 'y' => 121]]]],
                    ],
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file);

        $this->assertStringContainsString('一切歌頌讚美', $result['raw']);
        $this->assertStringContainsString('ko tey-kak', $result['raw']);
        $this->assertStringNotContainsString('3 3', $result['raw']);
    }

    public function test_throws_runtime_exception_on_api_failure(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([], 403),
        ]);

        $this->expectException(\RuntimeException::class);

        $file = UploadedFile::fake()->image('score.png');
        $this->service->extractLines($file);
    }
}
