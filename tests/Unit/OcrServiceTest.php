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

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'textAnnotations' => [
                        ['description' => 'FULL_TEXT', 'boundingPoly' => ['vertices' => [['x' => 0, 'y' => 0]]]],
                        // line 1: y≈100, spread within 15px tolerance
                        ['description' => 'ko', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 100]]]],
                        ['description' => 'tey-kak', 'boundingPoly' => ['vertices' => [['x' => 50, 'y' => 113]]]],
                        ['description' => 'za', 'boundingPoly' => ['vertices' => [['x' => 120, 'y' => 99]]]],
                        // line 2: y≈160, more than 15px away from line 1
                        ['description' => 'ma-i', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 160]]]],
                        ['description' => 'ka-na', 'boundingPoly' => ['vertices' => [['x' => 60, 'y' => 162]]]],
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

    public function test_raw_includes_song_title_and_all_content(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'textAnnotations' => [
                        ['description' => 'FULL_TEXT', 'boundingPoly' => ['vertices' => [['x' => 0, 'y' => 0]]]],
                        // title line y≈50
                        ['description' => 'Azwain', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 50]]]],
                        ['description' => 'ta', 'boundingPoly' => ['vertices' => [['x' => 80, 'y' => 51]]]],
                        ['description' => 'si', 'boundingPoly' => ['vertices' => [['x' => 110, 'y' => 50]]]],
                        ['description' => 'Yeso', 'boundingPoly' => ['vertices' => [['x' => 140, 'y' => 50]]]],
                        // lyrics line y≈100
                        ['description' => 'ko', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 100]]]],
                        ['description' => 'tey-kak', 'boundingPoly' => ['vertices' => [['x' => 50, 'y' => 101]]]],
                        // number line y≈140
                        ['description' => '3', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 140]]]],
                        ['description' => '3', 'boundingPoly' => ['vertices' => [['x' => 30, 'y' => 141]]]],
                    ],
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file);

        // raw contains everything including title and numbers
        $this->assertStringContainsString('Azwain ta si Yeso', $result['raw']);
        $this->assertStringContainsString('ko tey-kak', $result['raw']);
        $this->assertStringContainsString('3 3', $result['raw']);
    }

    public function test_skips_line_matching_song_title_in_parsed_lines(): void
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

    public function test_song_title_starting_with_chord_letter_is_not_filtered_from_lines(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'textAnnotations' => [
                        ['description' => 'FULL_TEXT', 'boundingPoly' => ['vertices' => [['x' => 0, 'y' => 0]]]],
                        // title "Azwain ta si Yeso" - starts with A but is not a chord
                        ['description' => 'Azwain', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 50]]]],
                        ['description' => 'ta', 'boundingPoly' => ['vertices' => [['x' => 80, 'y' => 51]]]],
                        ['description' => 'si', 'boundingPoly' => ['vertices' => [['x' => 110, 'y' => 50]]]],
                        ['description' => 'Yeso', 'boundingPoly' => ['vertices' => [['x' => 140, 'y' => 50]]]],
                        // real chord line "G Am C"
                        ['description' => 'G', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 80]]]],
                        ['description' => 'Am', 'boundingPoly' => ['vertices' => [['x' => 30, 'y' => 81]]]],
                        ['description' => 'C', 'boundingPoly' => ['vertices' => [['x' => 55, 'y' => 80]]]],
                        // lyrics line
                        ['description' => 'ko', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 120]]]],
                        ['description' => 'tey-kak', 'boundingPoly' => ['vertices' => [['x' => 50, 'y' => 121]]]],
                    ],
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file);

        $textNatives = array_column($result['lines'], 'text_native');
        // "Azwain ta si Yeso" is NOT a chord line — should be kept
        $this->assertContains('Azwain ta si Yeso', $textNatives);
        // "G Am C" IS a chord line — should be filtered
        $this->assertNotContains('G Am C', $textNatives);
        // lyrics kept
        $this->assertContains('ko tey-kak', $textNatives);
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
