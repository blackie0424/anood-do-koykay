<?php

namespace App\Http\Controllers;

use App\Services\LineSongLookupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class LineWebhookController extends Controller
{
    private const HOW_TO_MESSAGE = "手上有紙本歌本：輸入歌本上的頁碼，例如 44\n手上沒有歌本：輸入「目錄」，看有哪些歌和頁碼\n（群組裡請先 @Anood助理 再輸入）";

    private const USAGE_MESSAGE = "大家好，我是 Anood 助理 🎵\n".self::HOW_TO_MESSAGE;

    private const JOIN_MESSAGE = self::USAGE_MESSAGE;

    private const MEMBER_JOINED_MESSAGE = "歡迎新朋友！\n".self::HOW_TO_MESSAGE;

    public function __construct(private LineSongLookupService $lookup) {}

    public function handle(Request $request): JsonResponse
    {
        $body = $request->getContent();
        $signature = $request->header('X-Line-Signature');

        if (! $this->verifySignature($body, $signature)) {
            return response()->json(['message' => 'invalid signature'], 400);
        }

        $payload = json_decode($body, true) ?? [];

        foreach (($payload['events'] ?? []) as $event) {
            $this->handleEvent($event);
        }

        return response()->json(['status' => 'ok']);
    }

    private function verifySignature(string $body, ?string $signature): bool
    {
        $secret = config('services.line.channel_secret');

        if (! $secret || ! $signature) {
            return false;
        }

        $expected = base64_encode(hash_hmac('sha256', $body, $secret, true));

        return hash_equals($expected, $signature);
    }

    private function handleEvent(array $event): void
    {
        match ($event['type'] ?? null) {
            'join' => $this->handleGroupEvent($event, self::JOIN_MESSAGE),
            'memberJoined' => $this->handleGroupEvent($event, self::MEMBER_JOINED_MESSAGE),
            'message' => $this->handleMessageEvent($event),
            default => null,
        };
    }

    private function handleMessageEvent(array $event): void
    {
        if (($event['message']['type'] ?? null) !== 'text') {
            return;
        }

        $source = $event['source'] ?? [];
        $isMultiPerson = $this->isMultiPersonSource($source);

        // 群組／多人聊天室：只有明確 @ 到機器人本身（真 @ 或手打的「@Anood」開頭）才回應。
        // 不然群組裡每一句閒聊都會被當成點歌查詢、每句都被回一則訊息，人多時會嚴重干擾。
        // 私訊（1 對 1）不需要 @，照常回應。
        if ($isMultiPerson && ! $this->isAddressedToBot($event)) {
            return;
        }

        $replyToken = $event['replyToken'] ?? null;
        if (! $replyToken) {
            return;
        }

        $query = $this->lookup->parseQuery($event['message']['text'] ?? '', $isMultiPerson);

        if ($query === '') {
            $this->sendReply($replyToken, self::USAGE_MESSAGE);

            return;
        }

        $song = $this->lookup->find($query);

        $reply = $song
            ? $song->title_native."\n".rtrim(config('app.url'), '/')."/songs/{$song->id}"
            : $this->notFoundMessage($query, $source);

        $this->sendReply($replyToken, $reply);
    }

    private function isMultiPersonSource(array $source): bool
    {
        return in_array($source['type'] ?? null, ['group', 'room'], true);
    }

    private function isAddressedToBot(array $event): bool
    {
        return $this->isBotMentioned($event)
            || $this->lookup->isAddressedByPlainText($event['message']['text'] ?? '');
    }

    // 只認「明確 @ 到機器人本身」（LINE 在 mentionees 標記 isSelf）。
    // 「@全體成員」的 mentionee 是 type=all、沒有 isSelf，不會被當成叫機器人。
    private function isBotMentioned(array $event): bool
    {
        foreach (($event['message']['mention']['mentionees'] ?? []) as $mentionee) {
            if (($mentionee['isSelf'] ?? false) === true) {
                return true;
            }
        }

        return false;
    }

    // 群組裡查不到歌時，回覆前面冠上發話者名字，讓多人聊天中看得出這則
    // 回覆是回給誰的。取不到名字（API 失敗、非群組來源）就只回原本的訊息。
    private function notFoundMessage(string $query, array $source): string
    {
        $message = "找不到「{$query}」這首歌，請確認頁碼或歌名";
        $name = $this->fetchDisplayName($source);

        return $name ? "{$name}，{$message}" : $message;
    }

    private function fetchDisplayName(array $source): ?string
    {
        $token = config('services.line.channel_access_token');
        $userId = $source['userId'] ?? null;

        if (! $token || ! $userId) {
            return null;
        }

        $url = match ($source['type'] ?? null) {
            'group' => isset($source['groupId'])
                ? "https://api.line.me/v2/bot/group/{$source['groupId']}/member/{$userId}"
                : null,
            'room' => isset($source['roomId'])
                ? "https://api.line.me/v2/bot/room/{$source['roomId']}/member/{$userId}"
                : null,
            default => null,
        };

        if (! $url) {
            return null;
        }

        try {
            $response = Http::withToken($token)->get($url);

            return $response->successful() ? ($response->json('displayName') ?: null) : null;
        } catch (\Throwable $e) {
            // 取名字失敗不該讓整則回覆消失，降級成沒有名字的訊息
            return null;
        }
    }

    // join（Bot 被邀請進群組）／memberJoined（新成員加入群組）共用：用 push API 對 groupId 發訊息。
    // 這兩種事件雖然也帶 replyToken，但 push 不受 reply 時效限制，行為更穩定。
    private function handleGroupEvent(array $event, string $message): void
    {
        $groupId = $event['source']['groupId'] ?? null;
        if (! $groupId) {
            return;
        }

        $this->sendPush($groupId, $message);
    }

    private function sendReply(string $replyToken, string $text): void
    {
        $token = config('services.line.channel_access_token');
        if (! $token) {
            return;
        }

        Http::withToken($token)->post('https://api.line.me/v2/bot/message/reply', [
            'replyToken' => $replyToken,
            'messages' => [
                ['type' => 'text', 'text' => $text],
            ],
        ]);
    }

    private function sendPush(string $to, string $text): void
    {
        $token = config('services.line.channel_access_token');
        if (! $token) {
            return;
        }

        Http::withToken($token)->post('https://api.line.me/v2/bot/message/push', [
            'to' => $to,
            'messages' => [
                ['type' => 'text', 'text' => $text],
            ],
        ]);
    }
}
