<?php

namespace App\Http\Controllers;

use App\Services\LineSongLookupService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class LineWebhookController extends Controller
{
    private const USAGE_MESSAGE = "輸入頁碼或歌名就可以點歌囉 🎵\n例如：44　或　主愛我\n（群組裡請先 @ 我再輸入）";
    private const JOIN_MESSAGE = "大家好，我是 Anood 助理 🎵\n輸入「@Anood助理 頁碼」或「@Anood助理 歌名」就可以點歌！\n例如：@Anood助理 44 或 @Anood助理 主愛我";
    private const MEMBER_JOINED_MESSAGE = "歡迎新朋友！輸入「@Anood助理 頁碼」可以點達悟族詩歌 🎵";

    public function __construct(private LineSongLookupService $lookup)
    {
    }

    public function handle(Request $request): JsonResponse
    {
        $body = $request->getContent();
        $signature = $request->header('X-Line-Signature');

        if (!$this->verifySignature($body, $signature)) {
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

        if (!$secret || !$signature) {
            return false;
        }

        $expected = base64_encode(hash_hmac('sha256', $body, $secret, true));

        return hash_equals($expected, $signature);
    }

    private function handleEvent(array $event): void
    {
        $type = $event['type'] ?? null;

        if ($type === 'join') {
            $this->handleGroupEvent($event, self::JOIN_MESSAGE);
            return;
        }

        if ($type === 'memberJoined') {
            $this->handleGroupEvent($event, self::MEMBER_JOINED_MESSAGE);
            return;
        }

        if ($type !== 'message') {
            return;
        }
        if (($event['message']['type'] ?? null) !== 'text') {
            return;
        }

        $source = $event['source'] ?? [];

        // 群組／多人聊天室：只有明確 @ 到機器人本身才回應。不然群組裡每一句
        // 閒聊都會被當成點歌查詢、每句都被回一則訊息，人多時會嚴重干擾。
        // 私訊（1 對 1）不需要 @，照常回應。
        if ($this->isMultiPersonSource($source) && !$this->isBotMentioned($event)) {
            return;
        }

        $replyToken = $event['replyToken'] ?? null;
        if (!$replyToken) {
            return;
        }

        $query = $this->lookup->parseQuery($event['message']['text'] ?? '');

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

        if (!$token || !$userId) {
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

        if (!$url) {
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
        if (!$groupId) {
            return;
        }

        $this->sendPush($groupId, $message);
    }

    private function sendReply(string $replyToken, string $text): void
    {
        $token = config('services.line.channel_access_token');
        if (!$token) {
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
        if (!$token) {
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
