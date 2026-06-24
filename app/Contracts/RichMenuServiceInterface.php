<?php

namespace App\Contracts;

interface RichMenuServiceInterface
{
    /**
     * 建立圖文選單，回傳 richMenuId
     */
    public function create(array $data): string;

    /**
     * 上傳圖文選單圖片
     */
    public function uploadImage(string $richMenuId, string $imagePath): void;

    /**
     * 設定系統預設圖文選單
     */
    public function setDefault(string $richMenuId): void;

    /**
     * 批量綁定所有使用者
     */
    public function linkToAll(string $richMenuId): void;

    /**
     * 綁定指定使用者
     */
    public function linkToUser(string $lineUserId, string $richMenuId): void;

    /**
     * 解除指定使用者的個人選單綁定（還原為預設）
     */
    public function unlinkFromUser(string $lineUserId): void;

    /**
     * 刪除所有現有圖文選單
     */
    public function deleteAll(): void;

    /**
     * 取得所有圖文選單列表
     */
    public function list(): array;
}
