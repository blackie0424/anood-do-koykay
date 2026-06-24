<?php

namespace App\Console\Commands;

use App\Models\Fish;
use App\Services\GoogleDocsService;
use Illuminate\Console\Command;

class ExportFishToGoogleDocs extends Command
{
    protected $signature = 'fish:export-to-docs';

    protected $description = '將所有魚類資料匯出至 Google Docs 文件（每次覆蓋）';

    public function handle(): int
    {
        // 區塊處理大型 Google Docs 物件需要較大記憶體，CLI 不受 web 限制
        ini_set('memory_limit', '512M');

        $docId = config('services.google.docs_document_id');
        if (empty($docId)) {
            $this->error('請在 .env 設定 GOOGLE_DOCS_DOCUMENT_ID');
            return self::FAILURE;
        }

        $credentialsPath = storage_path(
            config('services.google.credentials_path', 'app/google-credentials.json')
        );
        if (!file_exists($credentialsPath)) {
            $this->error("找不到 Google 憑證檔案：{$credentialsPath}");
            return self::FAILURE;
        }

        $exportTribes = array_values(array_intersect(
            config('fish_options.tribes', []),
            ['imowrod', 'iraraley']
        ));
        $fishes = Fish::with([
            'tribalClassifications' => fn ($q) => $q->whereIn('tribe', $exportTribes),
            'captureRecords' => fn ($q) => $q->latest('capture_date')->latest('id'),
            'displayCaptureRecord',
        ])->orderBy('name')->get();

        $this->info("正在匯出 {$fishes->count()} 筆魚類資料...");

        try {
            $service = app(GoogleDocsService::class);
            $service->exportFishes($docId, $fishes);
        } catch (\Exception $e) {
            $this->error('匯出失敗：' . $e->getMessage());
            return self::FAILURE;
        }

        $this->info('匯出完成！');
        return self::SUCCESS;
    }
}
