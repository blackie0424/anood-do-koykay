<?php

namespace App\Contracts;

use App\Models\User;

interface LineUserServiceInterface
{
    public function upsert(string $lineUserId, string $displayName, ?string $pictureUrl = null): User;

    public function assignRole(string $lineUserId, string $role): User;

    public function getRole(string $lineUserId): string;
}
