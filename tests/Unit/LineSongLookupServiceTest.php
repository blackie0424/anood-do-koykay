<?php

namespace Tests\Unit;

use App\Models\Song;
use App\Services\LineSongLookupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LineSongLookupServiceTest extends TestCase
{
    use RefreshDatabase;

    private LineSongLookupService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new LineSongLookupService();
    }

    // ── parseQuery ──────────────────────────────────────────────

    public function test_parse_query_trims_whitespace(): void
    {
        $this->assertSame('44', $this->service->parseQuery('  44  '));
    }

    public function test_parse_query_strips_leading_mention(): void
    {
        $this->assertSame('44', $this->service->parseQuery('@詩歌小秘書 44'));
    }

    public function test_parse_query_strips_mention_with_extra_spaces(): void
    {
        $this->assertSame('耶穌', $this->service->parseQuery('@詩歌小秘書   耶穌'));
    }

    public function test_parse_query_without_mention_unchanged(): void
    {
        $this->assertSame('耶穌', $this->service->parseQuery('耶穌'));
    }

    public function test_parse_query_mention_only_returns_empty_string(): void
    {
        $this->assertSame('', $this->service->parseQuery('@詩歌小秘書'));
    }

    public function test_parse_query_empty_string_returns_empty(): void
    {
        $this->assertSame('', $this->service->parseQuery('   '));
    }

    // ── find：頁碼查詢 ──────────────────────────────────────────

    public function test_find_by_book_number_returns_matching_published_song(): void
    {
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $found = $this->service->find('44');

        $this->assertNotNull($found);
        $this->assertSame($song->id, $found->id);
    }

    public function test_find_by_book_number_not_found_returns_null(): void
    {
        Song::factory()->published()->create(['book_number' => '1']);

        $this->assertNull($this->service->find('999'));
    }

    public function test_find_by_book_number_ignores_draft_songs(): void
    {
        Song::factory()->create(['status' => 'draft', 'book_number' => '44']);

        $this->assertNull($this->service->find('44'));
    }

    // ── find：文字查詢 ──────────────────────────────────────────

    public function test_find_by_title_native_partial_match(): void
    {
        $song = Song::factory()->published()->create(['title_native' => 'Yeso ko anoyongan imo']);

        $found = $this->service->find('anoyongan');

        $this->assertNotNull($found);
        $this->assertSame($song->id, $found->id);
    }

    public function test_find_by_title_zh_partial_match(): void
    {
        $song = Song::factory()->published()->create(['title_zh' => '耶穌愛我']);

        $found = $this->service->find('耶穌');

        $this->assertNotNull($found);
        $this->assertSame($song->id, $found->id);
    }

    public function test_find_by_title_not_found_returns_null(): void
    {
        Song::factory()->published()->create(['title_native' => 'Yeso', 'title_zh' => '耶穌']);

        $this->assertNull($this->service->find('不存在的歌名'));
    }

    public function test_find_with_empty_query_returns_null(): void
    {
        Song::factory()->published()->create();

        $this->assertNull($this->service->find(''));
    }
}
