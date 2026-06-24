<?php

namespace App\Contracts;

interface StorageServiceInterface
{
    /**
     * 組合完整媒體 URL
     *
     * @param string $type 'images' | 'audios' | 'audio'
     * @param string $filename 檔名或完整 URL
     * @param bool|null $hasWebp 是否使用 WebP 版本
     * @return string 完整的媒體 URL
     */
    public function getUrl(string $type, string $filename, ?bool $hasWebp = null): string;

    /**
     * 產生簽名上傳 URL（用於前端直接上傳）
     *
     * @param string $filePath 完整路徑（含目錄）
     * @param int $expiresIn 有效秒數
     * @return string|null 簽名 URL，失敗回傳 null
     */
    public function createSignedUploadUrl(string $filePath, int $expiresIn = 60): ?string;

    /**
     * 產生 pending 音訊的簽名上傳 URL
     *
     * @param int $fishId 魚類 ID
     * @param string $ext 副檔名 (預設 m4a)
     * @param int $expiresIn 有效秒數
     * @return array{uploadUrl: string, filePath: string, expiresIn: int}|null
     */
    public function createSignedUploadUrlForPendingAudio(int $fishId, string $ext = 'm4a', int $expiresIn = 300): ?array;

    /**
     * 移動/重命名物件
     *
     * @param string $sourcePath 來源路徑
     * @param string $destPath 目標路徑
     * @return string|null 成功回傳目標路徑，失敗 null
     */
    public function moveObject(string $sourcePath, string $destPath): ?string;

    /**
     * 刪除檔案
     *
     * @param string $filePath 檔案路徑
     * @return bool 成功回傳 true
     */
    public function delete(string $filePath): bool;

    /**
     * 刪除檔案（含驗證）
     *
     * @param string $filePath 檔案路徑
     * @return array{success: bool, message?: string, error?: string}
     */
    public function deleteWithValidation(string $filePath): array;

    /**
     * 取得圖片目錄路徑
     *
     * @return string
     */
    public function getImageFolder(): string;

    /**
     * 取得音訊目錄路徑
     *
     * @return string
     */
    public function getAudioFolder(): string;

    /**
     * 取得 WebP 目錄路徑
     *
     * @return string
     */
    public function getWebpFolder(): string;

    /**
     * 直接上傳檔案（legacy 模式，建議使用 createSignedUploadUrl）
     *
     * @param mixed $file 上傳的檔案物件
     * @param string $path 目標路徑
     * @return string 完整檔案 URL
     * @deprecated 建議使用 createSignedUploadUrl 替代
     */
    public function uploadFile($file, string $path): string;

    /**
     * 檢查檔案是否存在
     *
     * @param string $filePath 檔案路徑
     * @return bool
     */
    public function fileExists(string $filePath): bool;
}
