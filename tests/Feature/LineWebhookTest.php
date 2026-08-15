<?php

namespace Tests\Feature;

use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LineWebhookTest extends TestCase
{
    use RefreshDatabase;

    private string $secret = 'test-channel-secret';

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.line.channel_secret', $this->secret);
        Config::set('services.line.channel_access_token', 'test-access-token');
    }

    private function signedPost(array $payload)
    {
        $body = json_encode($payload);
        $signature = base64_encode(hash_hmac('sha256', $body, $this->secret, true));

        return $this->call('POST', '/webhook/line', [], [], [], [
            'HTTP_X_LINE_SIGNATURE' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body);
    }

    private function textEvent(string $text, string $replyToken = 'reply-token-1'): array
    {
        return [
            'events' => [[
                'type' => 'message',
                'replyToken' => $replyToken,
                'message' => ['type' => 'text', 'text' => $text],
            ]],
        ];
    }

    // ── Signature 驗證 ──────────────────────────────────────────

    public function test_invalid_signature_returns_400(): void
    {
        $body = json_encode($this->textEvent('44'));

        $response = $this->call('POST', '/webhook/line', [], [], [], [
            'HTTP_X_LINE_SIGNATURE' => 'not-a-valid-signature',
            'CONTENT_TYPE' => 'application/json',
        ], $body);

        $response->assertStatus(400);
    }

    public function test_missing_signature_returns_400(): void
    {
        $body = json_encode($this->textEvent('44'));

        $response = $this->call('POST', '/webhook/line', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $body);

        $response->assertStatus(400);
    }

    public function test_valid_signature_returns_200(): void
    {
        Http::fake();

        $this->signedPost($this->textEvent('沒有這首歌'))->assertStatus(200);
    }

    // ── 頁碼查詢 ─────────────────────────────────────────────────

    public function test_book_number_query_found_replies_with_title_and_link(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create([
            'title_native' => 'Yeso ko anoyongan imo',
            'book_number' => '44',
        ]);

        $this->signedPost($this->textEvent('44'))->assertStatus(200);

        Http::assertSent(function ($request) use ($song) {
            $data = $request->data();
            $text = $data['messages'][0]['text'] ?? '';
            return $request->url() === 'https://api.line.me/v2/bot/message/reply'
                && $data['replyToken'] === 'reply-token-1'
                && str_contains($text, 'Yeso ko anoyongan imo')
                && str_contains($text, "/songs/{$song->id}");
        });
    }

    public function test_book_number_query_reply_link_forces_external_browser(): void
    {
        // 曾短暫移除過 ?openExternalBrowser=1（怕污染 Inertia 路由），現在
        // SongController 那邊已經會偵測這個參數並轉址清掉（見
        // PageRoutesTest::test_song_show_page_with_open_external_browser_param_redirects_to_clean_url），
        // 所以重新加回來，讓 LINE App 改用外部瀏覽器開啟，避開 LINE 內建
        // 瀏覽器對音訊播放較嚴格的限制。
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->textEvent('44'))->assertStatus(200);

        Http::assertSent(function ($request) use ($song) {
            $text = $request->data()['messages'][0]['text'] ?? '';
            return str_contains($text, "/songs/{$song->id}?openExternalBrowser=1");
        });
    }

    public function test_book_number_query_not_found_replies_with_not_found_message(): void
    {
        Http::fake();

        $this->signedPost($this->textEvent('999'))->assertStatus(200);

        Http::assertSent(function ($request) {
            return ($request->data()['messages'][0]['text'] ?? null) === '找不到「999」，請確認頁碼或歌名';
        });
    }

    public function test_book_number_query_ignores_draft_songs(): void
    {
        Http::fake();
        Song::factory()->create(['status' => 'draft', 'book_number' => '44']);

        $this->signedPost($this->textEvent('44'))->assertStatus(200);

        Http::assertSent(function ($request) {
            return ($request->data()['messages'][0]['text'] ?? null) === '找不到「44」，請確認頁碼或歌名';
        });
    }

    // ── 文字查詢 ─────────────────────────────────────────────────

    public function test_title_query_found_replies_with_title_and_link(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['title_zh' => '耶穌愛我']);

        $this->signedPost($this->textEvent('耶穌'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    public function test_title_query_not_found_replies_with_not_found_message(): void
    {
        Http::fake();

        $this->signedPost($this->textEvent('查無此歌'))->assertStatus(200);

        Http::assertSent(fn ($request) => ($request->data()['messages'][0]['text'] ?? null) === '找不到「查無此歌」，請確認頁碼或歌名');
    }

    // ── 群組 @mention ────────────────────────────────────────────

    public function test_group_mention_is_stripped_before_lookup(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->textEvent('@詩歌小秘書 44'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    public function test_mention_only_with_no_query_replies_with_usage_message(): void
    {
        Http::fake();

        $this->signedPost($this->textEvent('@詩歌小秘書'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', '輸入頁碼或歌名就可以點歌'));
    }

    public function test_empty_text_replies_with_usage_message_not_not_found(): void
    {
        Http::fake();

        $this->signedPost($this->textEvent(''))->assertStatus(200);

        Http::assertSent(function ($request) {
            $text = $request->data()['messages'][0]['text'] ?? '';
            return str_contains($text, '輸入頁碼或歌名就可以點歌') && !str_contains($text, '找不到');
        });
    }

    // ── join／memberJoined：群組歡迎訊息 ──────────────────────────

    public function test_join_event_pushes_welcome_message_to_group(): void
    {
        Http::fake();

        $payload = ['events' => [[
            'type' => 'join',
            'source' => ['type' => 'group', 'groupId' => 'group-123'],
        ]]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertSent(function ($request) {
            $data = $request->data();
            return $request->url() === 'https://api.line.me/v2/bot/message/push'
                && $data['to'] === 'group-123'
                && str_contains($data['messages'][0]['text'], 'Anood 助理')
                && str_contains($data['messages'][0]['text'], '點歌');
        });
    }

    public function test_join_event_without_group_id_does_nothing(): void
    {
        Http::fake();

        $payload = ['events' => [['type' => 'join', 'source' => ['type' => 'user']]]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertNothingSent();
    }

    public function test_member_joined_event_pushes_short_welcome_to_group(): void
    {
        Http::fake();

        $payload = ['events' => [[
            'type' => 'memberJoined',
            'source' => ['type' => 'group', 'groupId' => 'group-456'],
        ]]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertSent(function ($request) {
            $data = $request->data();
            return $request->url() === 'https://api.line.me/v2/bot/message/push'
                && $data['to'] === 'group-456'
                && str_contains($data['messages'][0]['text'], '歡迎新朋友');
        });
    }

    public function test_member_joined_event_without_group_id_does_nothing(): void
    {
        Http::fake();

        $payload = ['events' => [['type' => 'memberJoined', 'source' => ['type' => 'user']]]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertNothingSent();
    }

    public function test_join_event_skips_push_when_access_token_missing(): void
    {
        Config::set('services.line.channel_access_token', null);
        Http::fake();

        $payload = ['events' => [[
            'type' => 'join',
            'source' => ['type' => 'group', 'groupId' => 'group-123'],
        ]]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertNothingSent();
    }

    // ── 白箱／邊界：事件型別分支 ────────────────────────────────

    public function test_non_message_event_is_skipped(): void
    {
        Http::fake();

        $payload = ['events' => [['type' => 'follow', 'replyToken' => 'reply-token-1']]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertNothingSent();
    }

    public function test_non_text_message_is_skipped(): void
    {
        Http::fake();

        $payload = ['events' => [[
            'type' => 'message',
            'replyToken' => 'reply-token-1',
            'message' => ['type' => 'sticker'],
        ]]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertNothingSent();
    }

    public function test_missing_reply_token_is_skipped(): void
    {
        Http::fake();

        $payload = ['events' => [[
            'type' => 'message',
            'message' => ['type' => 'text', 'text' => '44'],
        ]]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertNothingSent();
    }

    public function test_multiple_events_each_get_a_reply(): void
    {
        Http::fake();
        Song::factory()->published()->create(['book_number' => '1']);
        Song::factory()->published()->create(['book_number' => '2']);

        $payload = ['events' => [
            ['type' => 'message', 'replyToken' => 'token-a', 'message' => ['type' => 'text', 'text' => '1']],
            ['type' => 'message', 'replyToken' => 'token-b', 'message' => ['type' => 'text', 'text' => '2']],
        ]];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertSentCount(2);
    }

    public function test_empty_events_array_returns_200_without_sending(): void
    {
        Http::fake();

        $this->signedPost(['events' => []])->assertStatus(200);

        Http::assertNothingSent();
    }

    // ── 整合：CSRF except（走真實 route/middleware） ────────────

    public function test_route_is_excepted_from_csrf_verification(): void
    {
        Http::fake();

        // 未帶任何 CSRF token；若沒有正確 except 會回 419 而不是 200
        $response = $this->signedPost($this->textEvent('44'));

        $response->assertStatus(200);
    }

    // ── 異常：未設定 channel_access_token 時不呼叫 LINE API 但仍回 200 ──

    public function test_missing_access_token_skips_reply_but_still_returns_200(): void
    {
        Config::set('services.line.channel_access_token', null);
        Http::fake();

        $this->signedPost($this->textEvent('44'))->assertStatus(200);

        Http::assertNothingSent();
    }

    // ── 異常：body 不是合法 JSON 時不崩潰 ──────────────────────

    public function test_malformed_json_body_returns_200_without_crashing(): void
    {
        $body = 'not-json{{{';
        $signature = base64_encode(hash_hmac('sha256', $body, $this->secret, true));
        Http::fake();

        $response = $this->call('POST', '/webhook/line', [], [], [], [
            'HTTP_X_LINE_SIGNATURE' => $signature,
            'CONTENT_TYPE' => 'application/json',
        ], $body);

        $response->assertStatus(200);
        Http::assertNothingSent();
    }
}
