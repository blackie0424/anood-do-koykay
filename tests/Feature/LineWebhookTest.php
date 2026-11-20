<?php

namespace Tests\Feature;

use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LineWebhookTest extends TestCase
{
    use RefreshDatabase;

    private string $secret = 'test-channel-secret';

    private const INTRO_TEXT = "大家好，我是 Anood 助理 🎵\n手上有紙本歌本：輸入歌本上的頁碼，例如 44\n手上沒有歌本：輸入「目錄」，看有哪些歌和頁碼\n（群組裡請先 @Anood助理 再輸入）";

    private const MEMBER_JOINED_TEXT = "歡迎新朋友！\n手上有紙本歌本：輸入歌本上的頁碼，例如 44\n手上沒有歌本：輸入「目錄」，看有哪些歌和頁碼\n（群組裡請先 @Anood助理 再輸入）";

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

    /**
     * 群組／多人聊天室的文字訊息事件。
     *
     * @param  string  $mention  'bot'（明確 @ 機器人）｜'all'（@全體成員）｜'none'（沒有 @）
     */
    private function groupTextEvent(string $text, string $mention = 'bot', string $sourceType = 'group'): array
    {
        $source = $sourceType === 'room'
            ? ['type' => 'room', 'roomId' => 'room-123', 'userId' => 'user-456']
            : ['type' => 'group', 'groupId' => 'group-123', 'userId' => 'user-456'];

        $message = ['type' => 'text', 'text' => $text];

        if ($mention === 'bot') {
            $message['mention'] = ['mentionees' => [
                ['index' => 0, 'length' => 6, 'type' => 'user', 'userId' => 'bot-user', 'isSelf' => true],
            ]];
        } elseif ($mention === 'all') {
            $message['mention'] = ['mentionees' => [
                ['index' => 0, 'length' => 4, 'type' => 'all'],
            ]];
        }

        return [
            'events' => [[
                'type' => 'message',
                'replyToken' => 'reply-token-1',
                'source' => $source,
                'message' => $message,
            ]],
        ];
    }

    private function assertNoReplySent(): void
    {
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/v2/bot/message/'));
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

    public function test_book_number_query_reply_link_has_no_extra_query_params(): void
    {
        // 曾試過 ?openExternalBrowser=1 強制用外部瀏覽器開啟，最後證實問題
        // 根因是「整頁重新載入」本身（跟瀏覽器種類無關），换瀏覽器治標不
        // 治本，改回讓 LINE 用內建瀏覽器開，這條測試固定「回覆連結就是
        // 乾淨的 /songs/{id}」這個行為。
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->textEvent('44'))->assertStatus(200);

        Http::assertSent(function ($request) use ($song) {
            $text = $request->data()['messages'][0]['text'] ?? '';

            return str_contains($text, "/songs/{$song->id}") && ! str_contains($text, '?');
        });
    }

    public function test_book_number_query_not_found_replies_with_not_found_message(): void
    {
        Http::fake();

        $this->signedPost($this->textEvent('999'))->assertStatus(200);

        Http::assertSent(function ($request) {
            return ($request->data()['messages'][0]['text'] ?? null) === '找不到「999」這首歌，請確認頁碼或歌名';
        });
    }

    public function test_book_number_query_ignores_draft_songs(): void
    {
        Http::fake();
        Song::factory()->create(['status' => 'draft', 'book_number' => '44']);

        $this->signedPost($this->textEvent('44'))->assertStatus(200);

        Http::assertSent(function ($request) {
            return ($request->data()['messages'][0]['text'] ?? null) === '找不到「44」這首歌，請確認頁碼或歌名';
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

        Http::assertSent(fn ($request) => ($request->data()['messages'][0]['text'] ?? null) === '找不到「查無此歌」這首歌，請確認頁碼或歌名');
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

        Http::assertSent(fn ($request) => ($request->data()['messages'][0]['text'] ?? '') === self::INTRO_TEXT);
    }

    public function test_empty_text_replies_with_usage_message_not_not_found(): void
    {
        Http::fake();

        $this->signedPost($this->textEvent(''))->assertStatus(200);

        Http::assertSent(function ($request) {
            $text = $request->data()['messages'][0]['text'] ?? '';

            return $text === self::INTRO_TEXT && ! str_contains($text, '找不到');
        });
    }

    // ── 群組只在被 @ 時回應（避免干擾群組聊天） ──────────────────

    public function test_group_message_without_mention_is_ignored(): void
    {
        Http::fake();
        Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent('44', 'none'))->assertStatus(200);

        $this->assertNoReplySent();
    }

    public function test_group_message_that_looks_like_chat_is_ignored(): void
    {
        // 這正是問題情境：群組裡的一般聊天，不該被當成點歌查詢而被回「找不到」
        Http::fake();

        $this->signedPost($this->groupTextEvent('今天在改播放器的 bug', 'none'))->assertStatus(200);

        $this->assertNoReplySent();
    }

    public function test_group_mention_all_does_not_trigger_bot(): void
    {
        Http::fake();
        Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent('@全體成員 44', 'all'))->assertStatus(200);

        $this->assertNoReplySent();
    }

    public function test_group_message_mentioning_bot_replies_with_song_link(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent('@Anood助理 44', 'bot'))->assertStatus(200);

        Http::assertSent(function ($request) use ($song) {
            return $request->url() === 'https://api.line.me/v2/bot/message/reply'
                && str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}");
        });
    }

    public function test_group_message_mentioning_bot_without_query_replies_with_usage(): void
    {
        Http::fake();

        $this->signedPost($this->groupTextEvent('@Anood助理', 'bot'))->assertStatus(200);

        Http::assertSent(fn ($request) => ($request->data()['messages'][0]['text'] ?? '') === self::INTRO_TEXT);
    }

    public function test_room_message_without_mention_is_ignored(): void
    {
        Http::fake();

        $this->signedPost($this->groupTextEvent('44', 'none', 'room'))->assertStatus(200);

        $this->assertNoReplySent();
    }

    public function test_room_message_mentioning_bot_replies(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent('@Anood助理 44', 'bot', 'room'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    public function test_direct_message_replies_without_needing_mention(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $payload = [
            'events' => [[
                'type' => 'message',
                'replyToken' => 'reply-token-1',
                'source' => ['type' => 'user', 'userId' => 'user-456'],
                'message' => ['type' => 'text', 'text' => '44'],
            ]],
        ];
        $this->signedPost($payload)->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    // ── 群組找不到歌時，回覆冠上發話者名字 ────────────────────────

    public function test_group_not_found_reply_includes_sender_display_name(): void
    {
        Http::fake([
            'api.line.me/v2/bot/group/*/member/*' => Http::response(['displayName' => '小明'], 200),
            '*' => Http::response([], 200),
        ]);

        $this->signedPost($this->groupTextEvent('@Anood助理 查無此歌', 'bot'))->assertStatus(200);

        Http::assertSent(function ($request) {
            if ($request->url() !== 'https://api.line.me/v2/bot/message/reply') {
                return false;
            }

            return ($request->data()['messages'][0]['text'] ?? null) === '小明，找不到「查無此歌」這首歌，請確認頁碼或歌名';
        });
    }

    public function test_group_not_found_reply_falls_back_when_profile_api_fails(): void
    {
        Http::fake([
            'api.line.me/v2/bot/group/*/member/*' => Http::response([], 500),
            '*' => Http::response([], 200),
        ]);

        $this->signedPost($this->groupTextEvent('@Anood助理 查無此歌', 'bot'))->assertStatus(200);

        Http::assertSent(function ($request) {
            if ($request->url() !== 'https://api.line.me/v2/bot/message/reply') {
                return false;
            }

            return ($request->data()['messages'][0]['text'] ?? null) === '找不到「查無此歌」這首歌，請確認頁碼或歌名';
        });
    }

    public function test_group_found_reply_does_not_fetch_display_name(): void
    {
        // 有查到歌就直接回連結，不需要多打一次 profile API
        Http::fake();
        Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent('@Anood助理 44', 'bot'))->assertStatus(200);

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/member/'));
    }

    // ── 群組一般文字 @Anood（不是 LINE 標記的藍字） ─────────────

    private function assertReplySentToLine(): void
    {
        Http::assertSent(fn ($request) => $request->url() === 'https://api.line.me/v2/bot/message/reply');
    }

    #[DataProvider('plainTextMentionPageQueries')]
    public function test_group_plain_text_anood_prefix_triggers_song_lookup(string $text): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent($text, 'none'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    public static function plainTextMentionPageQueries(): array
    {
        return [
            '空格分隔' => ['@Anood 44'],
            '大小寫不分且接助理' => ['@anood助理 44'],
            '無空格純數字' => ['@Anood44'],
            '助理後無空格純數字' => ['@Anood助理44'],
            '前綴前有全形空白' => ['　@Anood 44'],
            '全形空白分隔' => ['@Anood　44'],
        ];
    }

    public function test_group_plain_text_anood_with_title_after_space_finds_song(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['title_native' => '主愛我']);

        $this->signedPost($this->groupTextEvent('@Anood 主愛我', 'none'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    public function test_group_plain_text_anood_without_space_before_catalog_keyword_is_answered(): void
    {
        Http::fake();

        $this->signedPost($this->groupTextEvent('@Anood目錄', 'none'))->assertStatus(200);

        $this->assertReplySentToLine();
    }

    public function test_group_plain_text_anood_only_replies_with_usage(): void
    {
        Http::fake();

        $this->signedPost($this->groupTextEvent('@Anood', 'none'))->assertStatus(200);

        Http::assertSent(fn ($request) => ($request->data()['messages'][0]['text'] ?? '') === self::INTRO_TEXT);
    }

    public function test_room_plain_text_anood_prefix_triggers_song_lookup(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent('@Anood 44', 'none', 'room'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    #[DataProvider('plainTextNotAddressedToBot')]
    public function test_group_text_not_addressed_to_bot_is_ignored(string $text): void
    {
        Http::fake();
        Song::factory()->published()->create(['book_number' => '44', 'title_native' => '主愛我']);

        $this->signedPost($this->groupTextEvent($text, 'none'))->assertStatus(200);

        $this->assertNoReplySent();
    }

    public static function plainTextNotAddressedToBot(): array
    {
        return [
            '對別人說話' => ['@王小明 44'],
            'Anood 後緊接其他人名' => ['@Anood其他人 44'],
            '無空格歌名' => ['@Anood主愛我'],
            'Anood 出現在中間' => ['大家看 @Anood 目錄'],
            '字母接在 Anood 後' => ['@Anoodle 44'],
        ];
    }

    public function test_plain_text_prefix_is_stripped_only_once(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['title_native' => '@王小明 的歌']);

        $this->signedPost($this->groupTextEvent('@Anood @王小明', 'none'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    public function test_direct_message_keeps_legacy_leading_mention_stripping(): void
    {
        // 私訊不受手打 @Anood 規則影響：舊規則會把整段「@Anood44」當成 @ 去掉，變成空查詢回簡介
        Http::fake();
        Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->textEvent('@Anood44'))->assertStatus(200);

        Http::assertSent(fn ($request) => ($request->data()['messages'][0]['text'] ?? '') === self::INTRO_TEXT);
    }

    public function test_real_mention_of_bot_renamed_with_anood_prefix_is_parsed_by_legacy_rule(): void
    {
        // Bot 改名為「Anoodle」時，真 @ 的文字「@Anoodle 44」要整段當 @ 去掉，而不是留下「le 44」
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent('@Anoodle 44', 'bot'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    public function test_real_mention_with_renamed_bot_still_strips_leading_mention(): void
    {
        Http::fake();
        $song = Song::factory()->published()->create(['book_number' => '44']);

        $this->signedPost($this->groupTextEvent('@詩歌小秘書 44', 'bot'))->assertStatus(200);

        Http::assertSent(fn ($request) => str_contains($request->data()['messages'][0]['text'] ?? '', "/songs/{$song->id}"));
    }

    // ── 目錄（輪播） ─────────────────────────────────────────────

    private const PAGE_COLOR = '#2F7D5B';

    private const NO_PAGE_COLOR = '#8A6D1F';

    private const NAV_COLOR = '#5A6772';

    /** 取出剛送出的第一則回覆訊息 */
    private function sentMessage(): array
    {
        $recorded = Http::recorded();
        $this->assertNotEmpty($recorded, '沒有送出任何回覆');

        return $recorded[0][0]->data()['messages'][0];
    }

    private function carouselBubbles(): array
    {
        $message = $this->sentMessage();
        $this->assertSame('flex', $message['type']);
        $this->assertSame('carousel', $message['contents']['type']);

        return $message['contents']['contents'];
    }

    /** 一張卡片每一行的文字（頁碼與歌名用全形空白連起來） */
    private function rowTexts(array $bubble): array
    {
        return array_map(
            fn ($row) => implode('　', array_column($row['contents'] ?? [$row], 'text')),
            $bubble['body']['contents']
        );
    }

    private function headerTitle(array $bubble): string
    {
        return $bubble['header']['contents'][0]['text'];
    }

    private function headerSubtitle(array $bubble): string
    {
        return $bubble['header']['contents'][1]['text'];
    }

    private function footerText(array $bubble): string
    {
        return $bubble['footer']['contents'][0]['text'];
    }

    private function publishedSong(?string $page, string $title): Song
    {
        return Song::factory()->published()->create(['book_number' => $page, 'title_native' => $title, 'title_zh' => 'ZH-'.$title]);
    }

    public function test_catalog_in_direct_message_replies_with_one_carousel_and_alt_text(): void
    {
        Http::fake();
        $this->publishedSong('44', 'A');
        $this->publishedSong(null, 'B');
        Song::factory()->create(['book_number' => '1', 'title_native' => 'draft']);

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $this->assertCount(1, Http::recorded());
        $this->assertSame('Anood 詩歌目錄，共 2 首', $this->sentMessage()['altText']);
        $this->carouselBubbles();
    }

    #[DataProvider('groupCatalogTriggers')]
    public function test_catalog_in_group_replies_when_bot_is_addressed(string $text, string $mention): void
    {
        Http::fake();
        $this->publishedSong('44', 'A');

        $this->signedPost($this->groupTextEvent($text, $mention))->assertStatus(200);

        $this->assertSame('flex', $this->sentMessage()['type']);
    }

    public static function groupCatalogTriggers(): array
    {
        return [
            '真 @' => ['@Anood助理 目錄', 'bot'],
            '手打 @ 有空格' => ['@anood助理 目錄', 'none'],
            '手打 @ 無空格' => ['@Anood目錄', 'none'],
        ];
    }

    public function test_catalog_in_group_without_mention_is_ignored(): void
    {
        Http::fake();
        $this->publishedSong('44', 'A');

        $this->signedPost($this->groupTextEvent('目錄', 'none'))->assertStatus(200);

        $this->assertNoReplySent();
    }

    public function test_catalog_classifies_page_numbers_and_sorts_independently(): void
    {
        Http::fake();
        $this->publishedSong('12', 'a');
        $this->publishedSong('5', 'b');
        $this->publishedSong('044', 'c');
        $this->publishedSong('0', 'd');
        $this->publishedSong(' 7', 'e');
        $this->publishedSong('7 ', 'f');
        $this->publishedSong('１２', 'g');
        $this->publishedSong('12A', 'h');
        $this->publishedSong(null, 'i');
        $this->publishedSong('', 'j');
        $this->publishedSong(' ', 'k');
        $this->publishedSong('5', 'l');
        $this->publishedSong('100', 'm');
        Song::factory()->create(['book_number' => '3', 'title_native' => 'draft']);

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $bubbles = $this->carouselBubbles();
        $this->assertCount(3, $bubbles);
        $this->assertSame(['5　b', '5　l', '12　a', '100　m'], $this->rowTexts($bubbles[0]));
        $this->assertSame(['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], $this->rowTexts($bubbles[1]));
        $this->assertSame(['k'], $this->rowTexts($bubbles[2]));
    }

    public function test_catalog_keeps_twenty_digit_page_numbers_exact_and_sorted_by_value(): void
    {
        // 頁碼欄位最長 20 字元；超過 64 位整數範圍的頁碼不能被轉成整數而失真
        Http::fake();
        $bigger = $this->publishedSong('99999999999999999999', 'Bigger');
        $big = $this->publishedSong('99999999999999999998', 'Big');
        $this->publishedSong('9999999999999999999', 'Nineteen');
        $this->publishedSong('100', 'Hundred');
        $this->publishedSong('9', 'Nine');

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $bubble = $this->carouselBubbles()[0];
        $this->assertSame(
            ['9　Nine', '100　Hundred', '9999999999999999999　Nineteen', '99999999999999999998　Big', '99999999999999999999　Bigger'],
            $this->rowTexts($bubble)
        );
        $this->assertSame('第 9～99999999999999999999 頁', $this->headerTitle($bubble));
        $this->assertSame('輸入頁碼就可以點歌，例如 9', $this->footerText($bubble));

        // 目錄上顯示的頁碼，輸入後要能點到同一首
        Http::fake();
        $this->signedPost($this->textEvent('99999999999999999999'))->assertStatus(200);
        $this->assertStringContainsString("/songs/{$bigger->id}", $this->sentMessage()['text']);
        $this->assertNotSame($bigger->id, $big->id);
    }

    public function test_catalog_splits_cards_of_eight_and_never_mixes_page_and_no_page_songs(): void
    {
        Http::fake();
        for ($page = 1; $page <= 20; $page++) {
            $this->publishedSong((string) $page, "P{$page}");
        }
        for ($i = 1; $i <= 5; $i++) {
            $this->publishedSong(null, "N{$i}");
        }

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $bubbles = $this->carouselBubbles();
        $this->assertCount(4, $bubbles);
        $this->assertSame(['第 1～8 頁', '第 9～16 頁', '第 17～20 頁', '沒有頁碼的歌'], array_map(fn ($b) => $this->headerTitle($b), $bubbles));
        $this->assertSame(
            ['第 1 張／共 4 張・共 25 首', '第 2 張／共 4 張・共 25 首', '第 3 張／共 4 張・共 25 首', '第 4 張／共 4 張・共 25 首'],
            array_map(fn ($b) => $this->headerSubtitle($b), $bubbles)
        );
        $this->assertCount(8, $bubbles[0]['body']['contents']);
        $this->assertCount(4, $bubbles[2]['body']['contents']);
        $this->assertSame(['N1', 'N2', 'N3', 'N4', 'N5'], $this->rowTexts($bubbles[3]));
    }

    public function test_catalog_numbers_multiple_no_page_cards(): void
    {
        Http::fake();
        for ($i = 1; $i <= 9; $i++) {
            $this->publishedSong(null, "N{$i}");
        }

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $titles = array_map(fn ($b) => $this->headerTitle($b), $this->carouselBubbles());
        $this->assertSame(['沒有頁碼的歌（一）', '沒有頁碼的歌（二）'], $titles);
    }

    public function test_catalog_card_title_says_single_page_when_all_songs_share_one_page(): void
    {
        Http::fake();
        $this->publishedSong('44', 'A');
        $this->publishedSong('44', 'B');
        $this->publishedSong('44', 'C');

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $this->assertSame('第 44 頁', $this->headerTitle($this->carouselBubbles()[0]));
    }

    public function test_catalog_row_opens_song_page_and_hides_chinese_title(): void
    {
        Http::fake();
        Config::set('app.url', 'https://anood.test/');
        $withPage = $this->publishedSong('44', 'Yeso ko anoyongan imo');
        $withoutPage = $this->publishedSong(null, '主愛我');

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $bubbles = $this->carouselBubbles();
        $this->assertSame("https://anood.test/songs/{$withPage->id}", $bubbles[0]['body']['contents'][0]['action']['uri']);
        $this->assertSame("https://anood.test/songs/{$withoutPage->id}", $bubbles[1]['body']['contents'][0]['action']['uri']);
        $this->assertStringNotContainsString('ZH-', json_encode($this->sentMessage(), JSON_UNESCAPED_UNICODE));
    }

    public function test_catalog_footer_hint_in_direct_message(): void
    {
        Http::fake();
        $this->publishedSong('44', 'A');
        $this->publishedSong('60', 'B');
        $this->publishedSong(null, '主愛我');

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $bubbles = $this->carouselBubbles();
        $this->assertSame('輸入頁碼就可以點歌，例如 44', $this->footerText($bubbles[0]));
        $this->assertSame('輸入歌名就可以點歌，例如 主愛我', $this->footerText($bubbles[1]));
    }

    public function test_catalog_footer_hint_in_group_asks_to_mention_bot(): void
    {
        Http::fake();
        $this->publishedSong('44', 'A');
        $this->publishedSong(null, '主愛我');

        $this->signedPost($this->groupTextEvent('@Anood助理 目錄', 'bot'))->assertStatus(200);

        $bubbles = $this->carouselBubbles();
        $this->assertSame('@Anood助理 加頁碼就可以點歌，例如 44', $this->footerText($bubbles[0]));
        $this->assertSame('@Anood助理 加歌名就可以點歌，例如 主愛我', $this->footerText($bubbles[1]));
    }

    public function test_catalog_header_colors_tell_page_and_no_page_cards_apart(): void
    {
        Http::fake();
        $this->publishedSong('44', 'A');
        $this->publishedSong(null, 'B');

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $bubbles = $this->carouselBubbles();
        $this->assertSame(self::PAGE_COLOR, $bubbles[0]['header']['backgroundColor']);
        $this->assertSame(self::NO_PAGE_COLOR, $bubbles[1]['header']['backgroundColor']);
        $this->assertSame('#FFFFFF', $bubbles[0]['header']['contents'][0]['color']);
    }

    public function test_catalog_with_exactly_twelve_cards_lists_everything_without_nav_card(): void
    {
        Http::fake();
        for ($page = 1; $page <= 88; $page++) {
            $this->publishedSong((string) $page, "P{$page}");
        }
        $this->publishedSong(null, 'Last');

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $bubbles = $this->carouselBubbles();
        $this->assertCount(12, $bubbles);
        $this->assertSame('第 12 張／共 12 張・共 89 首', $this->headerSubtitle($bubbles[11]));
        $this->assertSame(self::NO_PAGE_COLOR, $bubbles[11]['header']['backgroundColor']);
        $this->assertSame(['Last'], $this->rowTexts($bubbles[11]));
    }

    public function test_catalog_over_twelve_cards_replaces_last_with_nav_card(): void
    {
        Http::fake();
        Config::set('app.url', 'https://anood.test');
        for ($page = 1; $page <= 89; $page++) {
            $this->publishedSong((string) $page, "P{$page}");
        }
        $this->publishedSong(null, 'Last');

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $bubbles = $this->carouselBubbles();
        $this->assertCount(12, $bubbles);
        $this->assertSame('第 11 張／共 12 張・共 90 首', $this->headerSubtitle($bubbles[10]));
        $nav = $bubbles[11];
        $this->assertSame(self::NAV_COLOR, $nav['header']['backgroundColor']);
        $this->assertSame('第 12 張／共 12 張・共 90 首', $this->headerSubtitle($nav));
        $json = json_encode($nav, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $this->assertStringContainsString('還有 2 首歌未列出，請到網站查看', $json);
        $this->assertStringContainsString('https://anood.test/', $json);
        $this->assertStringNotContainsString('Last', json_encode($bubbles, JSON_UNESCAPED_UNICODE));
    }

    public function test_catalog_without_published_songs_replies_with_text(): void
    {
        Http::fake();
        Song::factory()->create(['book_number' => '1', 'title_native' => 'draft']);

        $this->signedPost($this->textEvent('目錄'))->assertStatus(200);

        $message = $this->sentMessage();
        $this->assertSame('text', $message['type']);
        $this->assertSame('目前還沒有已發佈的歌曲', $message['text']);
    }

    public function test_title_containing_catalog_keyword_is_still_found_by_full_title(): void
    {
        Http::fake();
        $song = $this->publishedSong(null, '詩歌目錄第一首');

        $this->signedPost($this->textEvent('詩歌目錄第一首'))->assertStatus(200);

        $this->assertStringContainsString("/songs/{$song->id}", $this->sentMessage()['text']);
    }

    public function test_page_query_with_duplicate_page_replies_with_lowest_song_id(): void
    {
        Http::fake();
        $first = $this->publishedSong('44', 'First');
        $this->publishedSong('44', 'Second');

        $this->signedPost($this->textEvent('44'))->assertStatus(200);

        $this->assertStringContainsString("/songs/{$first->id}", $this->sentMessage()['text']);
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
                && $data['messages'][0]['text'] === self::INTRO_TEXT;
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
                && $data['messages'][0]['text'] === self::MEMBER_JOINED_TEXT;
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
