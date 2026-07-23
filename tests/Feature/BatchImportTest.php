<?php

namespace Tests\Feature;

use App\Models\Song;
use App\Models\User;
use App\Services\OcrService;
use App\Services\StorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BatchImportTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        $admin = User::factory()->create(['role' => 'admin']);
        return $admin->createToken('test')->plainTextToken;
    }

    // ── ocr-toc ──────────────────────────────────────────────────────

    public function test_ocr_toc_returns_parsed_entries(): void
    {
        $this->mock(OcrService::class, function ($mock) {
            $mock->shouldReceive('extractLines')
                ->once()
                ->andReturn(['raw' => "Do Koykay ........ 2\nAnood ........ 4", 'lines' => []]);
        });

        $token = $this->adminToken();
        $image = UploadedFile::fake()->image('toc.jpg');

        $this->withToken($token)
            ->postJson('/api/admin/batch-import/ocr-toc', ['images' => [$image]])
            ->assertOk()
            ->assertJsonCount(2, 'entries')
            ->assertJsonFragment(['title' => 'Do Koykay', 'page' => 2]);
    }

    public function test_ocr_toc_requires_at_least_one_image(): void
    {
        $token = $this->adminToken();
        $this->withToken($token)
            ->postJson('/api/admin/batch-import/ocr-toc', ['images' => []])
            ->assertUnprocessable();
    }

    public function test_ocr_toc_rejects_more_than_4_images(): void
    {
        $token = $this->adminToken();
        $images = array_map(fn($i) => UploadedFile::fake()->image("t{$i}.jpg"), range(1, 5));
        $this->withToken($token)
            ->postJson('/api/admin/batch-import/ocr-toc', ['images' => $images])
            ->assertUnprocessable();
    }

    // ── upload-scores ─────────────────────────────────────────────────

    public function test_upload_scores_returns_url_array(): void
    {
        Storage::fake('r2');
        $this->mock(StorageService::class, function ($mock) {
            $mock->shouldReceive('uploadFile')
                ->twice()
                ->andReturn('https://cdn.example.com/scores/a.jpg', 'https://cdn.example.com/scores/b.jpg');
        });

        $token = $this->adminToken();
        $images = [UploadedFile::fake()->image('p1.jpg'), UploadedFile::fake()->image('p2.jpg')];

        $this->withToken($token)
            ->postJson('/api/admin/batch-import/upload-scores', [
                'images' => $images,
                'pages'  => [1, 2],
            ])
            ->assertOk()
            ->assertJsonCount(2, 'uploads')
            ->assertJsonFragment(['page' => 1]);
    }

    // ── create-songs ──────────────────────────────────────────────────

    public function test_create_songs_creates_pending_review_records(): void
    {
        $this->mock(OcrService::class, function ($mock) {
            $mock->shouldReceive('extractLinesFromUrl')->andReturn(['raw' => '', 'lines' => []]);
        });

        $token = $this->adminToken();

        $this->withToken($token)->postJson('/api/admin/batch-import/create-songs', [
            'songs' => [
                ['title' => 'Do Koykay', 'start_page' => 1, 'end_page' => 2],
                ['title' => 'Anood',     'start_page' => 3, 'end_page' => 3],
            ],
            'score_urls' => [
                ['page' => 1, 'url' => 'https://cdn.example.com/1.jpg'],
                ['page' => 2, 'url' => 'https://cdn.example.com/2.jpg'],
                ['page' => 3, 'url' => 'https://cdn.example.com/3.jpg'],
            ],
        ])->assertOk()->assertJson(['created' => 2]);

        $this->assertDatabaseHas('songs', ['title_native' => 'Do Koykay', 'status' => 'pending_review']);
        $this->assertDatabaseHas('songs', ['title_native' => 'Anood',     'status' => 'pending_review']);
        $this->assertSame(2, Song::where('status', 'pending_review')->count());
    }

    public function test_guest_cannot_access_batch_import_apis(): void
    {
        $this->postJson('/api/admin/batch-import/ocr-toc')->assertUnauthorized();
        $this->postJson('/api/admin/batch-import/upload-scores')->assertUnauthorized();
        $this->postJson('/api/admin/batch-import/create-songs')->assertUnauthorized();
    }
}
