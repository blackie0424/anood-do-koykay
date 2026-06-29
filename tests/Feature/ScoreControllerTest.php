<?php

namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongScore;
use App\Models\User;
use App\Services\OcrService;
use App\Services\StorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ScoreControllerTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): array
    {
        $user = User::factory()->create();
        return ['Authorization' => 'Bearer ' . $user->createToken('test')->plainTextToken];
    }

    public function test_upload_score_creates_song_score_and_runs_ocr(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create(['title_native' => 'Azwain ta si Yeso']);

        $this->mock(StorageService::class)
            ->shouldReceive('uploadFile')->once()->andReturn('scores/1/score.png');

        $this->mock(OcrService::class)
            ->shouldReceive('extractLines')->once()
            ->andReturn([
                'raw' => "Azwain ta si Yeso\nko tey-kak",
                'lines' => [
                    ['order' => 1, 'text_native' => 'Azwain ta si Yeso', 'text_zh' => ''],
                    ['order' => 2, 'text_native' => 'ko tey-kak', 'text_zh' => ''],
                ],
            ]);

        $response = $this->withHeaders($headers)
            ->postJson("/api/admin/songs/{$song->id}/scores", [
                'score' => UploadedFile::fake()->image('score.png'),
            ]);

        $response->assertOk()->assertJsonStructure(['score', 'ocr_error']);

        $this->assertDatabaseHas('song_scores', [
            'song_id' => $song->id,
            'order' => 1,
            'image_url' => 'scores/1/score.png',
            'ocr_raw' => "Azwain ta si Yeso\nko tey-kak",
        ]);

        $this->assertDatabaseHas('song_lines', ['song_id' => $song->id, 'order' => 1, 'text_native' => 'Azwain ta si Yeso']);
        $this->assertDatabaseHas('song_lines', ['song_id' => $song->id, 'order' => 2, 'text_native' => 'ko tey-kak']);
    }

    public function test_upload_score_appends_ocr_lines_after_existing_lines(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create(['title_native' => 'Azwain']);
        $song->lines()->createMany([
            ['order' => 1, 'text_native' => 'existing line 1', 'text_zh' => ''],
            ['order' => 2, 'text_native' => 'existing line 2', 'text_zh' => ''],
        ]);

        $this->mock(StorageService::class)
            ->shouldReceive('uploadFile')->once()->andReturn('scores/1/score2.png');

        $this->mock(OcrService::class)
            ->shouldReceive('extractLines')->once()
            ->andReturn([
                'raw' => "new line 1\nnew line 2",
                'lines' => [
                    ['order' => 1, 'text_native' => 'new line 1', 'text_zh' => ''],
                    ['order' => 2, 'text_native' => 'new line 2', 'text_zh' => ''],
                ],
            ]);

        $this->withHeaders($headers)
            ->postJson("/api/admin/songs/{$song->id}/scores", [
                'score' => UploadedFile::fake()->image('score.png'),
            ])
            ->assertOk();

        $this->assertDatabaseHas('song_lines', ['song_id' => $song->id, 'order' => 3, 'text_native' => 'new line 1']);
        $this->assertDatabaseHas('song_lines', ['song_id' => $song->id, 'order' => 4, 'text_native' => 'new line 2']);
    }

    public function test_upload_score_auto_increments_order(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create();
        SongScore::factory()->create(['song_id' => $song->id, 'order' => 1]);
        SongScore::factory()->create(['song_id' => $song->id, 'order' => 2]);

        $this->mock(StorageService::class)
            ->shouldReceive('uploadFile')->once()->andReturn('scores/1/score3.png');
        $this->mock(OcrService::class)
            ->shouldReceive('extractLines')->once()->andReturn(['raw' => '', 'lines' => []]);

        $response = $this->withHeaders($headers)
            ->postJson("/api/admin/songs/{$song->id}/scores", [
                'score' => UploadedFile::fake()->image('score.png'),
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('song_scores', ['song_id' => $song->id, 'order' => 3]);
    }

    public function test_delete_score_removes_from_database(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create();
        $score = SongScore::factory()->create(['song_id' => $song->id]);

        $this->withHeaders($headers)
            ->deleteJson("/api/admin/songs/{$song->id}/scores/{$score->id}")
            ->assertOk();

        $this->assertDatabaseMissing('song_scores', ['id' => $score->id]);
    }

    public function test_reorder_updates_order_of_scores(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create();
        $s1 = SongScore::factory()->create(['song_id' => $song->id, 'order' => 1]);
        $s2 = SongScore::factory()->create(['song_id' => $song->id, 'order' => 2]);
        $s3 = SongScore::factory()->create(['song_id' => $song->id, 'order' => 3]);

        $this->withHeaders($headers)
            ->putJson("/api/admin/songs/{$song->id}/scores/reorder", [
                'order' => [$s3->id, $s1->id, $s2->id],
            ])
            ->assertOk();

        $this->assertDatabaseHas('song_scores', ['id' => $s3->id, 'order' => 1]);
        $this->assertDatabaseHas('song_scores', ['id' => $s1->id, 'order' => 2]);
        $this->assertDatabaseHas('song_scores', ['id' => $s2->id, 'order' => 3]);
    }

    public function test_reocr_updates_ocr_raw_on_score(): void
    {
        $headers = $this->actingAsAdmin();
        $song = Song::factory()->create(['title_native' => 'ko tey']);
        $score = SongScore::factory()->create([
            'song_id' => $song->id,
            'image_url' => 'https://example.com/score.png',
        ]);

        $this->mock(OcrService::class)
            ->shouldReceive('extractLinesFromUrl')->once()
            ->with('https://example.com/score.png', 'ko tey')
            ->andReturn(['raw' => "ko tey\nma-i ka-na", 'lines' => []]);

        $this->withHeaders($headers)
            ->postJson("/api/admin/songs/{$song->id}/scores/{$score->id}/reocr")
            ->assertOk()
            ->assertJsonFragment(['ocr_raw' => "ko tey\nma-i ka-na"]);

        $this->assertDatabaseHas('song_scores', [
            'id' => $score->id,
            'ocr_raw' => "ko tey\nma-i ka-na",
        ]);
    }

    public function test_all_endpoints_require_auth(): void
    {
        $song = Song::factory()->create();
        $score = SongScore::factory()->create(['song_id' => $song->id]);

        $this->postJson("/api/admin/songs/{$song->id}/scores", [])->assertUnauthorized();
        $this->deleteJson("/api/admin/songs/{$song->id}/scores/{$score->id}")->assertUnauthorized();
        $this->putJson("/api/admin/songs/{$song->id}/scores/reorder", [])->assertUnauthorized();
        $this->postJson("/api/admin/songs/{$song->id}/scores/{$score->id}/reocr")->assertUnauthorized();
    }
}
