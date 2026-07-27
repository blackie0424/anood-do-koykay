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
