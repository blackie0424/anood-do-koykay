<?php

namespace App\Contracts;

interface LineMessagingClientInterface
{
    public function validateSignature(string $body, string $signature): bool;

    /**
     * @return array{displayName: string, pictureUrl: ?string, userId: string}
     */
    public function getUserProfile(string $userId): array;

    public function replyMessage(string $replyToken, array $messages): void;

    public function getMessageContent(string $messageId): string;
}
