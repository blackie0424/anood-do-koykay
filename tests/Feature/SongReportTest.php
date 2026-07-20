<?php

namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SongReportTest extends TestCase
{
    use RefreshDatabase;

    // ── Public POST ─────────────────────────────────────────────────

    public function test_anyone_can_submit_report(): void
    {
        $song = Song::factory()->published()->create();

        $this->postJson("/api/songs/{$song->id}/reports", [
            'report_type' => 'lyrics_timing',
        ])->assertCreated()->assertJson(['ok' => true]);

        $this->assertDatabaseHas('song_reports', [
            'song_id'     => $song->id,
            'report_type' => 'lyrics_timing',
            'resolved'    => false,
        ]);
    }

    public function test_report_stores_optional_note(): void
    {
        $song = Song::factory()->published()->create();

        $this->postJson("/api/songs/{$song->id}/reports", [
            'report_type' => 'other',
            'note'        => '這是備註',
        ])->assertCreated();

        $this->assertDatabaseHas('song_reports', [
            'song_id' => $song->id,
            'note'    => '這是備註',
        ]);
    }

    public function test_report_requires_report_type(): void
    {
        $song = Song::factory()->published()->create();

        $this->postJson("/api/songs/{$song->id}/reports", [])
            ->assertUnprocessable();
    }

    // ── Admin PATCH toggle ──────────────────────────────────────────

    public function test_admin_can_toggle_resolved(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $admin->createToken('test')->plainTextToken;
        $song = Song::factory()->published()->create();
        $report = SongReport::factory()->create(['song_id' => $song->id, 'resolved' => false]);

        $this->withToken($token)->patchJson("/api/admin/reports/{$report->id}")
            ->assertOk()
            ->assertJson(['resolved' => true]);

        $this->assertDatabaseHas('song_reports', ['id' => $report->id, 'resolved' => true]);
    }

    public function test_toggle_resolved_flips_back_to_false(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $admin->createToken('test')->plainTextToken;
        $song = Song::factory()->published()->create();
        $report = SongReport::factory()->create(['song_id' => $song->id, 'resolved' => true]);

        $this->withToken($token)->patchJson("/api/admin/reports/{$report->id}")
            ->assertOk()
            ->assertJson(['resolved' => false]);
    }

    public function test_guest_cannot_toggle_resolved(): void
    {
        $song = Song::factory()->published()->create();
        $report = SongReport::factory()->create(['song_id' => $song->id]);

        $this->patchJson("/api/admin/reports/{$report->id}")->assertUnauthorized();
    }
}
