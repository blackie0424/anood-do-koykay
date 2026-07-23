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

    // ── create-songs ──────────────────────────────────────────────────

    public function test_create_songs_creates_pending_review_records(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)->postJson('/api/admin/batch-import/create-songs', [
            'songs' => [
                ['title' => 'Do Koykay', 'start_page' => 1],
                ['title' => 'Anood',     'start_page' => 3],
            ],
        ])->assertOk()->assertJson(['created' => 2]);

        $this->assertDatabaseHas('songs', ['title_native' => 'Do Koykay', 'book_number' => '1', 'status' => 'pending_review']);
        $this->assertDatabaseHas('songs', ['title_native' => 'Anood',     'book_number' => '3', 'status' => 'pending_review']);
        $this->assertSame(2, Song::where('status', 'pending_review')->count());
    }

    // ── upload-score-by-page ──────────────────────────────────────────

    public function test_upload_score_by_page_auto_attaches_single_match(): void
    {
        Storage::fake('r2');
        $this->mock(StorageService::class, function ($mock) {
            $mock->shouldReceive('uploadFile')
                ->once()
                ->andReturn('https://cdn.example.com/scores/a.jpg');
        });
        $this->mock(OcrService::class, function ($mock) {
            $mock->shouldReceive('extractLinesFromUrl')->andReturn(['raw' => '', 'lines' => []]);
        });

        $token = $this->adminToken();
        $song  = Song::factory()->create(['book_number' => '5', 'title_native' => 'Do Koykay']);

        $this->withToken($token)
            ->postJson('/api/admin/batch-import/upload-score-by-page', [
                'image' => UploadedFile::fake()->image('p5.jpg'),
                'page'  => 5,
            ])
            ->assertOk()
            ->assertJson(['auto_attached' => true])
            ->assertJsonCount(1, 'matched_songs');

        $this->assertDatabaseHas('song_scores', ['song_id' => $song->id]);
    }

    public function test_upload_score_by_page_returns_candidates_for_multiple_matches(): void
    {
        Storage::fake('r2');
        $this->mock(StorageService::class, function ($mock) {
            $mock->shouldReceive('uploadFile')
                ->once()
                ->andReturn('https://cdn.example.com/scores/a.jpg');
        });

        $token = $this->adminToken();
        Song::factory()->create(['book_number' => '5', 'title_native' => 'Song A']);
        Song::factory()->create(['book_number' => '5', 'title_native' => 'Song B']);

        $this->withToken($token)
            ->postJson('/api/admin/batch-import/upload-score-by-page', [
                'image' => UploadedFile::fake()->image('p5.jpg'),
                'page'  => 5,
            ])
            ->assertOk()
            ->assertJson(['auto_attached' => false])
            ->assertJsonCount(2, 'matched_songs');

        $this->assertDatabaseCount('song_scores', 0);
    }

    public function test_upload_score_by_page_returns_empty_when_no_song_matched(): void
    {
        Storage::fake('r2');
        $this->mock(StorageService::class, function ($mock) {
            $mock->shouldReceive('uploadFile')
                ->once()
                ->andReturn('https://cdn.example.com/scores/a.jpg');
        });

        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson('/api/admin/batch-import/upload-score-by-page', [
                'image' => UploadedFile::fake()->image('p99.jpg'),
                'page'  => 99,
            ])
            ->assertOk()
            ->assertJson(['auto_attached' => false])
            ->assertJsonCount(0, 'matched_songs');
    }

    // ── attach-score ──────────────────────────────────────────────────

    public function test_attach_score_attaches_to_song(): void
    {
        $this->mock(OcrService::class, function ($mock) {
            $mock->shouldReceive('extractLinesFromUrl')->andReturn(['raw' => '', 'lines' => []]);
        });

        $token = $this->adminToken();
        $song  = Song::factory()->create(['title_native' => 'Test Song']);

        $this->withToken($token)->postJson('/api/admin/batch-import/attach-score', [
            'song_id' => $song->id,
            'url'     => 'https://cdn.example.com/scores/a.jpg',
        ])->assertOk()->assertJson(['attached' => true]);

        $this->assertDatabaseHas('song_scores', [
            'song_id'   => $song->id,
            'image_url' => 'https://cdn.example.com/scores/a.jpg',
        ]);
    }

    // ── guest 保護 ────────────────────────────────────────────────────

    public function test_guest_cannot_access_batch_import_apis(): void
    {
        $this->postJson('/api/admin/batch-import/ocr-toc')->assertUnauthorized();
        $this->postJson('/api/admin/batch-import/create-songs')->assertUnauthorized();
        $this->postJson('/api/admin/batch-import/upload-score-by-page')->assertUnauthorized();
        $this->postJson('/api/admin/batch-import/attach-score')->assertUnauthorized();
    }
}
