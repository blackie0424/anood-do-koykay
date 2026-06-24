<?php

namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SongApiTest extends TestCase
{
    use RefreshDatabase;

    // ── Public API ──────────────────────────────────────────────────

    public function test_health_check_returns_ok(): void
    {
        $this->getJson('/api/health-check')
            ->assertOk()
            ->assertJson(['status' => 'ok']);
    }

    public function test_public_songs_index_returns_only_published(): void
    {
        Song::factory()->create(['status' => 'draft']);
        $published = Song::factory()->published()->create();

        $this->getJson('/api/songs')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['id' => $published->id]);
    }

    public function test_public_song_show_returns_404_for_draft(): void
    {
        $draft = Song::factory()->create(['status' => 'draft']);
        $this->getJson("/api/songs/{$draft->id}")->assertNotFound();
    }

    public function test_public_song_show_returns_song_with_lines(): void
    {
        $song = Song::factory()->published()->create();
        SongLine::factory()->count(3)->create(['song_id' => $song->id]);

        $this->getJson("/api/songs/{$song->id}")
            ->assertOk()
            ->assertJsonStructure(['id', 'title_native', 'lines']);
    }

    // ── Auth ────────────────────────────────────────────────────────

    public function test_admin_login_returns_token(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret')]);

        $this->postJson('/api/admin/login', ['email' => $user->email, 'password' => 'secret'])
            ->assertOk()
            ->assertJsonStructure(['token']);
    }

    public function test_admin_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret')]);

        $this->postJson('/api/admin/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertUnprocessable();
    }

    public function test_me_endpoint_requires_auth(): void
    {
        $this->getJson('/api/admin/me')->assertUnauthorized();
    }

    public function test_me_returns_user_info(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/admin/me')
            ->assertOk()
            ->assertJsonFragment(['email' => $user->email]);
    }

    // ── Admin Song CRUD ─────────────────────────────────────────────

    public function test_admin_can_create_song(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/admin/songs', [
                'title_native' => 'Do Koykay',
                'title_zh' => '飛魚之歌',
            ])
            ->assertCreated()
            ->assertJsonFragment(['title_native' => 'Do Koykay']);

        $this->assertDatabaseHas('songs', ['title_native' => 'Do Koykay']);
    }

    public function test_admin_can_update_song(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $song = Song::factory()->create();

        $this->withToken($token)
            ->putJson("/api/admin/songs/{$song->id}", ['title_native' => 'Updated'])
            ->assertOk()
            ->assertJsonFragment(['title_native' => 'Updated']);
    }

    public function test_admin_can_delete_song(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $song = Song::factory()->create();

        $this->withToken($token)
            ->deleteJson("/api/admin/songs/{$song->id}")
            ->assertOk()
            ->assertJsonFragment(['message' => '已刪除']);

        $this->assertDatabaseMissing('songs', ['id' => $song->id]);
    }

    // ── Song Lines ──────────────────────────────────────────────────

    public function test_admin_can_batch_store_lines(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $song = Song::factory()->create();

        $lines = [
            ['order' => 1, 'text_native' => 'Maomaw do koykay', 'text_zh' => '飛魚來了', 'start_time' => 0, 'end_time' => 3.5],
            ['order' => 2, 'text_native' => 'Anood', 'text_zh' => '海浪', 'start_time' => 3.5, 'end_time' => 7.0],
        ];

        $this->withToken($token)
            ->postJson("/api/admin/songs/{$song->id}/lines/batch", ['lines' => $lines])
            ->assertOk()
            ->assertJsonPath('lines.0.text_native', 'Maomaw do koykay');

        $this->assertDatabaseCount('song_lines', 2);
    }
}
