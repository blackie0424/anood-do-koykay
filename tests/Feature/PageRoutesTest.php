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
        // 瀏覽器真的整頁載入（沒有 X-Inertia 這個 header）：isColdLoad 為
        // true。純診斷用（診斷資訊列的 cold 欄位），不影響行為。
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
        // isColdLoad 為 false。同時要帶對版本的 X-Inertia-Version，不然
        // Inertia 中介層會判定版本不符、回 409（觸發前端強制整頁重新載入）
        // 而不是 200。這裡直接解析回應內容而不是用 assertInertia()——版本
        // 比對通過後 Inertia 回傳的是純 JSON（不是包在完整 HTML 裡），
        // assertInertia() 這個 fluent helper 對這種情況的解析在測試環境下
        // 不夠穩定，直接讀 JSON 比較單純可靠。
        $song = Song::factory()->published()->create();
        $version = app(HandleInertiaRequests::class)->version(request());

        $response = $this->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
            ->get("/songs/{$song->id}");

        $response->assertOk();
        $page = json_decode($response->getContent(), true);
        $this->assertSame('SongPlayer', $page['component']);
        $this->assertFalse($page['props']['isColdLoad']);
    }

    public function test_song_show_page_hides_diagnostics_by_default(): void
    {
        // 平常（PLAYER_DIAGNOSTICS 未設定或 false）不該把診斷資訊列開給
        // 一般使用者看到
        config(['app.player_diagnostics' => false]);
        $song = Song::factory()->published()->create();

        $this->get("/songs/{$song->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SongPlayer')
                ->where('showDiagnostics', false)
            );
    }

    public function test_song_show_page_shows_diagnostics_when_env_enabled(): void
    {
        // PLAYER_DIAGNOSTICS=true 時才把診斷資訊列打開（現場排查播放問題用）
        config(['app.player_diagnostics' => true]);
        $song = Song::factory()->published()->create();

        $this->get("/songs/{$song->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SongPlayer')
                ->where('showDiagnostics', true)
            );
    }

    public function test_diagnostics_config_reads_env_as_boolean(): void
    {
        // config 有做 (bool) 轉型：.env 讀進來的字串不會變成前端拿到字串
        // 而讓 Boolean prop 判斷失準
        $this->assertIsBool(config('app.player_diagnostics'));
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
