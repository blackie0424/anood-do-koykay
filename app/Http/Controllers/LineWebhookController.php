<?php

namespace App\Http\Controllers;

use App\Services\LineSongLookupService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class LineWebhookController extends Controller
{
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
        if (($event['type'] ?? null) !== 'message') {
            return;
        }
        if (($event['message']['type'] ?? null) !== 'text') {
            return;
        }

        $replyToken = $event['replyToken'] ?? null;
        if (!$replyToken) {
            return;
        }

        $query = $this->lookup->parseQuery($event['message']['text'] ?? '');
        $song = $this->lookup->find($query);

        $reply = $song
            ? $song->title_native."\n".rtrim(config('app.url'), '/')."/songs/{$song->id}"
            : "找不到「{$query}」，請確認頁碼或歌名";

        $this->sendReply($replyToken, $reply);
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
}
