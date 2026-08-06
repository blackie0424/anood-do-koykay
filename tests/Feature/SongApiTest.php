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
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['id' => $published->id]);
    }

    // ── Public Songs Index：分頁 ────────────────────────────────────

    public function test_songs_index_paginates_20_per_page_without_search(): void
    {
        Song::factory()->published()->count(25)->create();

        $response = $this->getJson('/api/songs')->assertOk();

        $response->assertJsonCount(20, 'data');
        $response->assertJsonPath('meta.current_page', 1);
        $response->assertJsonPath('meta.last_page', 2);
        $response->assertJsonPath('meta.total', 25);
    }

    public function test_songs_index_second_page_returns_remaining_songs(): void
    {
        Song::factory()->published()->count(25)->create();

        $response = $this->getJson('/api/songs?page=2')->assertOk();

        $response->assertJsonCount(5, 'data');
        $response->assertJsonPath('meta.current_page', 2);
    }

    public function test_songs_index_with_single_song_returns_one_page(): void
    {
        Song::factory()->published()->create();

        $response = $this->getJson('/api/songs')->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('meta.last_page', 1);
    }

    public function test_songs_index_invalid_page_zero_falls_back_to_page_1(): void
    {
        Song::factory()->published()->count(3)->create();

        $response = $this->getJson('/api/songs?page=0')->assertOk();

        $response->assertJsonPath('meta.current_page', 1);
        $response->assertJsonCount(3, 'data');
    }

    public function test_songs_index_invalid_negative_page_falls_back_to_page_1(): void
    {
        Song::factory()->published()->count(3)->create();

        $response = $this->getJson('/api/songs?page=-1')->assertOk();

        $response->assertJsonPath('meta.current_page', 1);
        $response->assertJsonCount(3, 'data');
    }

    public function test_songs_index_page_out_of_range_returns_empty_data(): void
    {
        Song::factory()->published()->count(3)->create();

        $response = $this->getJson('/api/songs?page=999')->assertOk();

        $response->assertJsonCount(0, 'data');
    }

    // ── Public Songs Index：搜尋 ────────────────────────────────────

    public function test_songs_search_matches_book_number(): void
    {
        $target = Song::factory()->published()->create(['book_number' => '042']);
        Song::factory()->published()->create(['book_number' => '099']);

        $response = $this->getJson('/api/songs?q=042')->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['id' => $target->id]);
    }

    public function test_songs_search_matches_title_native(): void
    {
        $target = Song::factory()->published()->create(['title_native' => 'Do Koykay']);
        Song::factory()->published()->create(['title_native' => 'Anood no Kasiboan']);

        $response = $this->getJson('/api/songs?q=Koykay')->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['id' => $target->id]);
    }

    public function test_songs_search_matches_title_zh(): void
    {
        $target = Song::factory()->published()->create(['title_zh' => '飛魚之歌']);
        Song::factory()->published()->create(['title_zh' => '拼板舟之歌']);

        $response = $this->getJson('/api/songs?q=飛魚')->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['id' => $target->id]);
    }

    public function test_songs_search_with_no_results_returns_empty_data(): void
    {
        Song::factory()->published()->create(['title_native' => 'Do Koykay']);

        $response = $this->getJson('/api/songs?q=不存在的關鍵字')->assertOk();

        $response->assertJsonCount(0, 'data');
    }

    public function test_songs_search_empty_query_string_behaves_like_no_search(): void
    {
        Song::factory()->published()->count(25)->create();

        $response = $this->getJson('/api/songs?q=')->assertOk();

        $response->assertJsonCount(20, 'data');
    }

    public function test_songs_search_uses_per_page_100_not_20(): void
    {
        Song::factory()->published()->count(30)->create(['title_native' => 'Do Koykay']);

        $response = $this->getJson('/api/songs?q=Koykay')->assertOk();

        $response->assertJsonCount(30, 'data');
        $response->assertJsonPath('meta.per_page', 100);
    }

    public function test_songs_search_excludes_draft_songs(): void
    {
        Song::factory()->create(['status' => 'draft', 'title_native' => 'Do Koykay draft']);
        $published = Song::factory()->published()->create(['title_native' => 'Do Koykay published']);

        $response = $this->getJson('/api/songs?q=Koykay')->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['id' => $published->id]);
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

    public function test_admin_can_update_audio_trim_points(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $song = Song::factory()->create(['audio_start' => null, 'audio_end' => null]);

        $this->withToken($token)
            ->putJson("/api/admin/songs/{$song->id}", ['audio_start' => 3.5, 'audio_end' => 120.0])
            ->assertOk();

        $this->assertDatabaseHas('songs', ['id' => $song->id, 'audio_start' => 3.5, 'audio_end' => 120.0]);
    }

    public function test_admin_can_clear_audio_trim_points(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $song = Song::factory()->create(['audio_start' => 3.5, 'audio_end' => 120.0]);

        $this->withToken($token)
            ->putJson("/api/admin/songs/{$song->id}", ['audio_start' => null, 'audio_end' => null])
            ->assertOk();

        $this->assertDatabaseHas('songs', ['id' => $song->id, 'audio_start' => null, 'audio_end' => null]);
    }

    public function test_admin_can_batch_store_lines(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $song = Song::factory()->create();

        $lines = [
            ['order' => 1, 'text_native' => 'Maomaw do koykay', 'start_time' => 0, 'end_time' => 3.5],
            ['order' => 2, 'text_native' => 'Anood', 'start_time' => 3.5, 'end_time' => 7.0],
        ];

        $this->withToken($token)
            ->postJson("/api/admin/songs/{$song->id}/lines/batch", ['lines' => $lines])
            ->assertOk()
            ->assertJsonPath('lines.0.text_native', 'Maomaw do koykay');

        $this->assertDatabaseCount('song_lines', 2);
    }
}
