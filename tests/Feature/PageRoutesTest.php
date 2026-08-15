<?php

namespace Tests\Feature;

use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PageRoutesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    // ── 前台 ─────────────────────────────────────────────────────────

    public function test_index_page_renders_song_list(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('SongList'));
    }

    public function test_index_page_provides_paginated_songs_prop(): void
    {
        Song::factory()->published()->count(25)->create();

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SongList')
                ->has('songs.data', 20)
                ->where('songs.meta.current_page', 1)
                ->where('songs.meta.last_page', 2)
                ->where('songs.meta.total', 25)
            );
    }

    public function test_song_show_page_renders_song_player(): void
    {
        $song = Song::factory()->published()->create();

        $this->get("/songs/{$song->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('SongPlayer'));
    }

    public function test_unpublished_song_returns_404(): void
    {
        $song = Song::factory()->create(['status' => 'draft']);

        $this->get("/songs/{$song->id}")->assertNotFound();
    }

    public function test_song_show_page_with_open_external_browser_param_redirects_to_clean_url(): void
    {
        // LINE App 用這個參數觸發「用外部瀏覽器開啟」，這個切換發生在
        // LINE App 自己那端；一旦外部瀏覽器（Safari）真的用這個網址打我們
        // 的伺服器，我們就把這個參數轉掉，避免它留在網址上污染 Inertia
        // 的前端路由狀態。
        $song = Song::factory()->published()->create();

        $this->get("/songs/{$song->id}?openExternalBrowser=1")
            ->assertRedirect("/songs/{$song->id}");
    }

    public function test_song_show_page_with_open_external_browser_param_preserves_other_query_params(): void
    {
        $song = Song::factory()->published()->create();

        $this->get("/songs/{$song->id}?foo=bar&openExternalBrowser=1")
            ->assertRedirect("/songs/{$song->id}?foo=bar");
    }

    public function test_song_show_page_without_open_external_browser_param_renders_normally(): void
    {
        $song = Song::factory()->published()->create();

        $this->get("/songs/{$song->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('SongPlayer'));
    }

    // ── 後台（admin） ────────────────────────────────────────────────

    public function test_admin_songs_index_renders_admin_songs(): void
    {
        $this->actingAs($this->admin())
            ->get('/admin/songs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Songs'));
    }

    public function test_admin_song_edit_renders_song_edit(): void
    {
        $song = Song::factory()->create();

        $this->actingAs($this->admin())
            ->get("/admin/songs/{$song->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/SongEdit'));
    }

    public function test_admin_song_media_renders_song_media(): void
    {
        $song = Song::factory()->create();

        $this->actingAs($this->admin())
            ->get("/admin/songs/{$song->id}/media")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/SongMedia'));
    }

    public function test_admin_song_lyrics_renders_song_lyrics(): void
    {
        $song = Song::factory()->create();

        $this->actingAs($this->admin())
            ->get("/admin/songs/{$song->id}/lyrics")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/SongLyrics'));
    }

    public function test_admin_users_renders_admin_users(): void
    {
        $this->actingAs($this->admin())
            ->get('/admin/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Users'));
    }

    public function test_admin_reports_renders_admin_reports(): void
    {
        $this->actingAs($this->admin())
            ->get('/admin/reports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Reports'));
    }

    public function test_admin_batch_import_renders_batch_import(): void
    {
        $this->actingAs($this->admin())
            ->get('/admin/batch-import')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/BatchImport'));
    }

    // ── 未登入跳轉 ──────────────────────────────────────────────────

    public function test_admin_routes_redirect_unauthenticated_to_login(): void
    {
        $this->get('/admin/songs')->assertRedirect('/login');
    }
}
