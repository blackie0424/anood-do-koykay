<?php

namespace App\Console\Commands;

use App\Models\CaptureRecord;
use App\Models\Fish;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateLegacyFishToCaptureRecords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'migrate:legacy-fish {--dry-run : 預覽模式，不實際寫入資料庫}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '將沒有捕獲紀錄的魚類批次建立預設捕獲紀錄';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 DRY-RUN 模式（不會真正寫入資料庫）');
            $this->line('====================================');
            $this->newLine();
        } else {
            $this->info('🚀 開始執行捕獲紀錄遷移');
            $this->line('====================================');
            $this->newLine();
        }

        // 查詢需要處理的魚類：Fish.image 尚未出現在捕獲紀錄中的魚類
        $allFish = Fish::with('captureRecords')->get();
        
        $fishNeedingMigration = $allFish->filter(function ($fish) {
            // 檢查是否已經有使用 Fish.image 作為 image_path 的捕獲紀錄
            $hasImageRecord = $fish->captureRecords->contains(function ($record) use ($fish) {
                return $record->image_path === $fish->image;
            });
            
            // 如果沒有，則需要遷移
            return !$hasImageRecord;
        });
        
        $count = $fishNeedingMigration->count();
        
        if ($count === 0) {
            $this->info('✅ 所有魚類的圖片都已存在於捕獲紀錄中！無需處理。');
            return Command::SUCCESS;
        }

        $this->info("找到 {$count} 筆魚類的圖片尚未加入捕獲紀錄");
        $this->newLine();

        if ($dryRun) {
            $this->warn('預覽即將建立的捕獲紀錄：');
            $this->line('--------------------------------------------------');
        }

        $successCount = 0;
        $errorCount = 0;
        $errors = [];

        // 使用進度條
        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($fishNeedingMigration as $fish) {
            try {
                // 準備捕獲紀錄資料
                $captureData = [
                    'fish_id' => $fish->id,
                    'image_path' => $fish->image,
                    'tribe' => 'iraraley',
                    'location' => '不確定',
                    'capture_method' => 'mamasil',
                    'capture_date' => $fish->created_at->format('Y-m-d'),
                    'notes' => '此為系統新增舊資料',
                ];

                if ($dryRun) {
                    // Dry-run 模式：只顯示資料
                    $this->newLine();
                    $existingRecordsCount = $fish->captureRecords->count();
                    $this->line("Fish ID: {$fish->id} | 名稱: {$fish->name} | 現有紀錄數: {$existingRecordsCount}");
                    $this->line("  → image_path: {$captureData['image_path']}");
                    $this->line("  → tribe: {$captureData['tribe']}");
                    $this->line("  → location: {$captureData['location']}");
                    $this->line("  → capture_method: {$captureData['capture_method']}");
                    $this->line("  → capture_date: {$captureData['capture_date']}");
                    $this->line("  → notes: {$captureData['notes']}");
                    $this->newLine();
                } else {
                    // 正式模式：寫入資料庫
                    CaptureRecord::create($captureData);
                }

                $successCount++;
            } catch (\Exception $e) {
                $errorCount++;
                $errors[] = "Fish ID {$fish->id} ({$fish->name}): {$e->getMessage()}";
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // 顯示結果摘要
        $this->line('--------------------------------------------------');
        
        if ($dryRun) {
            $this->info("✅ 預覽完成！共 {$successCount} 筆資料");
            if ($errorCount > 0) {
                $this->error("⚠️  發現 {$errorCount} 個潛在問題：");
                foreach ($errors as $error) {
                    $this->error("  - {$error}");
                }
            }
            $this->newLine();
            $this->warn('⚠️  這只是預覽，尚未寫入資料庫');
            $this->info('💡 確認無誤後，執行: php artisan migrate:legacy-fish');
        } else {
            $this->info("✅ 成功建立 {$successCount} 筆捕獲紀錄");
            if ($errorCount > 0) {
                $this->error("❌ 失敗 {$errorCount} 筆：");
                foreach ($errors as $error) {
                    $this->error("  - {$error}");
                }
            }
            
            // 驗證結果
            $this->newLine();
            $this->info('📊 驗證結果：');
            
            // 重新檢查還有多少魚類的圖片未加入捕獲紀錄
            $remainingFish = Fish::with('captureRecords')->get()->filter(function ($fish) {
                return !$fish->captureRecords->contains(function ($record) use ($fish) {
                    return $record->image_path === $fish->image;
                });
            });
            
            $remainingCount = $remainingFish->count();
            $this->line("  - 剩餘圖片未加入捕獲紀錄的魚類: {$remainingCount}");
            $this->line("  - 已有捕獲紀錄的魚類: " . Fish::has('captureRecords')->count());
        }

        $this->newLine();
        return Command::SUCCESS;
    }
}
