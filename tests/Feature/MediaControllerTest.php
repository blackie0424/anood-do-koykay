<?php

namespace Tests\Feature;

use App\Models\Song;
use App\Models\User;
use App\Services\OcrService;
use App\Services\StorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class MediaControllerTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): array
    {
        $user = User::factory()->create();
        return ['Authorization' => 'Bearer ' . $user->createToken('test')->plainTextToken];
    }

    public function test_upload_score_stores_ocr_raw_in_database(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create();

        $this->mock(StorageService::class)
            ->shouldReceive('uploadFile')
            ->once()
            ->andReturn('scores/1/score.png');

        $this->mock(OcrService::class)
            ->shouldReceive('extractLines')
            ->once()
            ->withArgs(fn($file, $title) => is_string($title))
            ->andReturn(['raw' => "ko tey-kak\nma-i ka-na", 'lines' => [
                ['order' => 1, 'text_native' => 'ko tey-kak', 'text_zh' => ''],
                ['order' => 2, 'text_native' => 'ma-i ka-na', 'text_zh' => ''],
            ]]);

        $response = $this->withHeaders($headers)
            ->postJson("/api/admin/songs/{$song->id}/score", [
                'score' => UploadedFile::fake()->image('score.png'),
            ]);

        $response->assertOk()
            ->assertJsonStructure(['score_image', 'lines_draft'])
            ->assertJsonCount(2, 'lines_draft');

        $this->assertDatabaseHas('songs', [
            'id' => $song->id,
            'ocr_raw' => "ko tey-kak\nma-i ka-na",
        ]);

        $this->assertDatabaseCount('song_lines', 2);
    }

    public function test_upload_score_returns_ocr_error_when_service_throws(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create();

        $this->mock(StorageService::class)
            ->shouldReceive('uploadFile')
            ->once()
            ->andReturn('scores/1/score.png');

        $this->mock(OcrService::class)
            ->shouldReceive('extractLines')
            ->once()
            ->withArgs(fn($file, $title) => is_string($title))
            ->andThrow(new \RuntimeException('OCR 辨識失敗（HTTP 403）'));

        $response = $this->withHeaders($headers)
            ->postJson("/api/admin/songs/{$song->id}/score", [
                'score' => UploadedFile::fake()->image('score.png'),
            ]);

        $response->assertOk()
            ->assertJsonFragment(['ocr_error' => 'OCR 辨識失敗（HTTP 403）'])
            ->assertJsonCount(0, 'lines_draft');

        $this->assertDatabaseCount('song_lines', 0);
    }

    public function test_upload_score_requires_auth(): void
    {
        $song = Song::factory()->create();

        $this->postJson("/api/admin/songs/{$song->id}/score", [
            'score' => UploadedFile::fake()->image('score.png'),
        ])->assertUnauthorized();
    }

    public function test_reocr_updates_ocr_raw_and_lines_in_database(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create(['score_image' => 'https://example.com/score.png']);

        $this->mock(OcrService::class)
            ->shouldReceive('extractLinesFromUrl')
            ->once()
            ->with('https://example.com/score.png', '')
            ->andReturn(['raw' => "ko tey-kak\nma-i ka-na", 'lines' => [
                ['order' => 1, 'text_native' => 'ko tey-kak', 'text_zh' => ''],
                ['order' => 2, 'text_native' => 'ma-i ka-na', 'text_zh' => ''],
            ]]);

        $response = $this->withHeaders($headers)
            ->postJson("/api/admin/songs/{$song->id}/score/reocr");

        $response->assertOk()
            ->assertJsonStructure(['ocr_raw', 'lines'])
            ->assertJsonCount(2, 'lines');

        $this->assertDatabaseHas('songs', [
            'id' => $song->id,
            'ocr_raw' => "ko tey-kak\nma-i ka-na",
        ]);

        $this->assertDatabaseCount('song_lines', 2);
    }

    public function test_reocr_returns_422_when_no_score_image(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create(['score_image' => null]);

        $this->withHeaders($headers)
            ->postJson("/api/admin/songs/{$song->id}/score/reocr")
            ->assertStatus(422)
            ->assertJsonFragment(['error' => '尚未上傳樂譜']);
    }

    public function test_reocr_requires_auth(): void
    {
        $song = Song::factory()->create(['score_image' => 'https://example.com/score.png']);

        $this->postJson("/api/admin/songs/{$song->id}/score/reocr")
            ->assertUnauthorized();
    }
}
