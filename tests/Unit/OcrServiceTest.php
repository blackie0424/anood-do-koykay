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

    public function test_returns_raw_text_and_parsed_lines_on_success(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'fullTextAnnotation' => [
                        'text' => "ko tey-kak\nma-i ka-na\n5 3 2 1\nG\n",
                    ],
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file);

        $this->assertArrayHasKey('raw', $result);
        $this->assertArrayHasKey('lines', $result);
        $this->assertStringContainsString('ko tey-kak', $result['raw']);
        // 數字行 "5 3 2 1" 和和弦行 "G" 應被過濾
        $this->assertCount(2, $result['lines']);
        $this->assertSame('ko tey-kak', $result['lines'][0]['text_native']);
        $this->assertSame('ma-i ka-na', $result['lines'][1]['text_native']);
    }

    public function test_raw_text_filters_out_symbol_and_number_only_lines(): void
    {
        Config::set('services.google.vision_api_key', 'test-key');

        $rawInput = "ko tey-kak\n3 3 3 3\nF 4/4\n一切歌頌讚美\n| 5 — — |\nG\n· •\nma-i ka-na";

        Http::fake([
            'vision.googleapis.com/*' => Http::response([
                'responses' => [[
                    'fullTextAnnotation' => ['text' => $rawInput],
                ]],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('score.png');
        $result = $this->service->extractLines($file);

        // raw 只保留含拉丁字母或 CJK 字元的行
        $this->assertStringContainsString('ko tey-kak', $result['raw']);
        $this->assertStringContainsString('一切歌頌讚美', $result['raw']);
        $this->assertStringContainsString('ma-i ka-na', $result['raw']);
        $this->assertStringNotContainsString('3 3 3 3', $result['raw']);
        $this->assertStringNotContainsString('| 5 — — |', $result['raw']);
        $this->assertStringNotContainsString('· •', $result['raw']);
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
