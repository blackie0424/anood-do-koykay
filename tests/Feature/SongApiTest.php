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

    // =====================================================
    // 公開 API
    // =====================================================

    public function test_public_songs_list_returns_only_published(): void
    {
        Song::factory()->create(['status' => 'draft', 'title_native' => 'Draft Song']);
        Song::factory()->create(['status' => 'published', 'title_native' => 'Published Song']);

        $response = $this->getJson('/api/songs');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['title_native' => 'Published Song'])
            ->assertJsonMissing(['title_native' => 'Draft Song']);
    }

    public function test_public_song_show_returns_song_with_lines(): void
    {
        $song = Song::factory()
            ->has(SongLine::factory()->count(3), 'lines')
            ->create(['status' => 'published']);

        $response = $this->getJson("/api/songs/{$song->id}");

        $response->assertOk()
            ->assertJsonPath('id', $song->id)
            ->assertJsonCount(3, 'lines');
    }

    public function test_public_song_show_returns_404_for_draft(): void
    {
        $song = Song::factory()->create(['status' => 'draft']);

        $this->getJson("/api/songs/{$song->id}")->assertNotFound();
    }

    // =====================================================
    // 後台認證
    // =====================================================

    public function test_admin_login_returns_token(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret')]);

        $response = $this->postJson('/api/admin/login', [
            'email' => $user->email,
            'password' => 'secret',
        ]);

        $response->assertOk()->assertJsonStructure(['token']);
    }

    public function test_admin_login_fails_with_wrong_credentials(): void
    {
        User::factory()->create(['email' => 'admin@example.com', 'password' => bcrypt('secret')]);

        $this->postJson('/api/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong',
        ])->assertUnprocessable();
    }

    public function test_admin_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('admin')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/admin/logout')
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/admin/me')
            ->assertUnauthorized();
    }

    // =====================================================
    // 後台歌曲 CRUD (需登入)
    // =====================================================

    public function test_admin_can_list_all_songs(): void
    {
        $user = User::factory()->create();
        Song::factory()->count(3)->create();

        $this->actingAs($user)
            ->getJson('/api/admin/songs')
            ->assertOk()
            ->assertJsonCount(3);
    }

    public function test_admin_can_create_song(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/admin/songs', [
            'title_native' => 'Araw Do Koykay',
            'title_zh' => '飛魚之歌',
        ]);

        $response->assertCreated()
            ->assertJsonPath('title_native', 'Araw Do Koykay');

        $this->assertDatabaseHas('songs', ['title_native' => 'Araw Do Koykay']);
    }

    public function test_admin_can_update_song(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create(['status' => 'draft']);

        $this->actingAs($user)
            ->putJson("/api/admin/songs/{$song->id}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('status', 'published');
    }

    public function test_admin_can_delete_song(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();

        $this->actingAs($user)
            ->deleteJson("/api/admin/songs/{$song->id}")
            ->assertOk();

        $this->assertDatabaseMissing('songs', ['id' => $song->id]);
    }

    public function test_unauthenticated_cannot_access_admin_songs(): void
    {
        $this->getJson('/api/admin/songs')->assertUnauthorized();
        $this->postJson('/api/admin/songs', ['title_native' => 'Test'])->assertUnauthorized();
    }

    // =====================================================
    // 歌詞管理
    // =====================================================

    public function test_admin_can_batch_save_song_lines(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();

        $lines = [
            ['order' => 1, 'text_native' => 'Do koykay', 'text_zh' => '飛魚', 'start_time' => 0.0, 'end_time' => 3.5],
            ['order' => 2, 'text_native' => 'Anood', 'text_zh' => '海浪', 'start_time' => 3.5, 'end_time' => 7.0],
        ];

        $response = $this->actingAs($user)
            ->postJson("/api/admin/songs/{$song->id}/lines/batch", ['lines' => $lines]);

        $response->assertOk()
            ->assertJsonCount(2, 'lines');

        $this->assertDatabaseCount('song_lines', 2);
    }

    public function test_batch_save_replaces_existing_lines(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()
            ->has(SongLine::factory()->count(5), 'lines')
            ->create();

        $this->actingAs($user)
            ->postJson("/api/admin/songs/{$song->id}/lines/batch", [
                'lines' => [
                    ['order' => 1, 'text_native' => 'New line', 'text_zh' => '新歌詞'],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseCount('song_lines', 1);
    }

    public function test_song_line_requires_order(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();

        $this->actingAs($user)
            ->postJson("/api/admin/songs/{$song->id}/lines/batch", [
                'lines' => [
                    ['text_native' => 'Missing order'],
                ],
            ])
            ->assertUnprocessable();
    }
}
