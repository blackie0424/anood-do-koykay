<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
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

    public function test_song_show_page_marks_is_cold_load_true_without_inertia_header(): void
    {
        // 瀏覽器真的整頁載入（沒有 X-Inertia 這個 header）：isColdLoad 要是 true，
        // 前端才會知道要悄悄用內部導覽重新整理一次。
        $song = Song::factory()->published()->create();

        $this->get("/songs/{$song->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SongPlayer')
                ->where('isColdLoad', true)
            );
    }

    public function test_song_show_page_marks_is_cold_load_false_with_inertia_header(): void
    {
        // Inertia 前端內部導覽送出的請求一定會帶 X-Inertia 這個 header：
        // isColdLoad 要是 false，不該再觸發悄悄重新導覽。同時要帶對版本
        // 的 X-Inertia-Version，不然 Inertia 中介層會判定版本不符、回
        // 409（觸發前端強制整頁重新載入）而不是 200。
        $song = Song::factory()->published()->create();
        $version = app(HandleInertiaRequests::class)->version(request());

        $this->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
            ->get("/songs/{$song->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SongPlayer')
                ->where('isColdLoad', false)
            );
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
