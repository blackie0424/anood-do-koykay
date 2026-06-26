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

    public function test_extract_lines_from_url_returns_same_structure_as_extract_lines(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'textAnnotations' => [
                        ['description' => 'FULL_TEXT', 'boundingPoly' => ['vertices' => [['x' => 0, 'y' => 0]]]],
                        ['description' => 'ko', 'boundingPoly' => ['vertices' => [['x' => 10, 'y' => 100]]]],
                        ['description' => 'tey-kak', 'boundingPoly' => ['vertices' => [['x' => 50, 'y' => 101]]]],
                    ],
                ]],
            ], 200),
        ]);

        $result = $this->service->extractLinesFromUrl('https://example.com/score.png');

        $this->assertArrayHasKey('raw', $result);
        $this->assertArrayHasKey('lines', $result);
        $this->assertSame('ko tey-kak', $result['raw']);
        $this->assertCount(1, $result['lines']);
        $this->assertSame('ko tey-kak', $result['lines'][0]['text_native']);
    }

    public function test_extract_lines_from_url_sends_image_uri_not_base64(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [['textAnnotations' => []]],
            ], 200),
        ]);

        $this->service->extractLinesFromUrl('https://example.com/score.png');

        Http::assertSent(function ($request) {
            $body = $request->data();
            $image = $body['requests'][0]['image'] ?? [];
            return isset($image['source']['imageUri'])
                && $image['source']['imageUri'] === 'https://example.com/score.png'
                && !isset($image['content']);
        });
    }

    public function test_extract_lines_from_url_returns_empty_when_api_key_not_configured(): void
    {
        Config::set('services.google.vision_api_key', null);

        $result = $this->service->extractLinesFromUrl('https://example.com/score.png');

        $this->assertSame(['raw' => '', 'lines' => []], $result);
    }

    public function test_smart_filter_correctly_classifies_all_line_types(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        $w = fn(string $d, int $x, int $y) => [
            'description' => $d,
            'boundingPoly' => ['vertices' => [['x' => $x, 'y' => $y]]],
        ];

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'textAnnotations' => [
                        $w('FULL_TEXT', 0, 0),
                        // y=50: Azwain ta si Yeso (kept — lyrics title)
                        $w('Azwain', 10, 50), $w('ta', 80, 50), $w('si', 110, 50), $w('Yeso', 140, 50),
                        // y=150: Ya- bo ma- ka- had si Ye- SO . (kept — lyrics)
                        $w('Ya-', 10, 150), $w('bo', 50, 150), $w('ma-', 80, 150), $w('ka-', 110, 150),
                        $w('had', 140, 150), $w('si', 170, 150), $w('Ye-', 200, 150), $w('SO', 230, 150), $w('.', 260, 150),
                        // y=250: 作詞 : (kept — contains Chinese)
                        $w('作詞', 10, 250), $w(':', 80, 250),
                        // y=350: macinanao (kept — Latin word)
                        $w('macinanao', 10, 350),
                        // y=450: 9 (filtered — pure number)
                        $w('9', 10, 450),
                        // y=550: | : 6 6 6 3 2 12 2 1 1 | 6 (filtered — symbol/notation line)
                        $w('|', 10, 550), $w(':', 30, 550), $w('6', 50, 550), $w('6', 70, 550),
                        $w('6', 90, 550), $w('3', 110, 550), $w('2', 130, 550), $w('12', 150, 550),
                        $w('2', 170, 550), $w('1', 190, 550), $w('1', 210, 550), $w('|', 230, 550), $w('6', 250, 550),
                        // y=650: Dm EN C7 Dm (filtered — chord ratio 75%)
                        $w('Dm', 10, 650), $w('EN', 50, 650), $w('C7', 80, 650), $w('Dm', 110, 650),
                        // y=750: Dm 3/4 syaman (kept — chord ratio 33%)
                        $w('Dm', 10, 750), $w('3/4', 50, 750), $w('syaman', 80, 750),
                        // y=850: C7 Dm Dm -TO (filtered — chord ratio 75%)
                        $w('C7', 10, 850), $w('Dm', 50, 850), $w('Dm', 80, 850), $w('-TO', 110, 850),
                        // y=950: G Am C (filtered — chord ratio 100%)
                        $w('G', 10, 950), $w('Am', 40, 950), $w('C', 70, 950),
                    ],
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file, '');
        $textNatives = array_column($result['lines'], 'text_native');

        $this->assertContains('Azwain ta si Yeso', $textNatives);
        $this->assertContains('Ya- bo ma- ka- had si Ye- SO .', $textNatives);
        $this->assertContains('作詞 :', $textNatives);
        $this->assertContains('macinanao', $textNatives);
        $this->assertContains('Dm 3/4 syaman', $textNatives);

        $this->assertNotContains('9', $textNatives);
        $this->assertNotContains('| : 6 6 6 3 2 12 2 1 1 | 6', $textNatives);
        $this->assertNotContains('Dm EN C7 Dm', $textNatives);
        $this->assertNotContains('C7 Dm Dm -TO', $textNatives);
        $this->assertNotContains('G Am C', $textNatives);
    }
}
