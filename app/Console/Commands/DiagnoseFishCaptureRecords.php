<?php

namespace App\Console\Commands;

use App\Models\Fish;
use App\Models\CaptureRecord;
use Illuminate\Console\Command;

class DiagnoseFishCaptureRecords extends Command
{
    protected $signature = 'diagnose:fish-records';
    protected $description = '診斷魚類和捕獲紀錄的資料狀態';

    public function handle()
    {
        $this->info('🔍 魚類與捕獲紀錄診斷報告');
        $this->line('====================================');
        $this->newLine();

        // 基本統計
        $totalFish = Fish::count();
        $fishWithRecords = Fish::has('captureRecords')->count();
        $fishWithoutRecords = Fish::doesntHave('captureRecords')->count();
        $totalRecords = CaptureRecord::count();

        // 計算有多少魚類的圖片未加入捕獲紀錄
        $fishWithImageNotInRecords = Fish::with('captureRecords')->get()->filter(function ($fish) {
            return !$fish->captureRecords->contains(function ($record) use ($fish) {
                return $record->image_path === $fish->image;
            });
        })->count();

        $this->info("📊 基本統計：");
        $this->line("  總魚類數: {$totalFish}");
        $this->line("  有捕獲紀錄的魚類: {$fishWithRecords}");
        $this->line("  沒有任何捕獲紀錄的魚類: {$fishWithoutRecords}");
        $this->line("  圖片未加入捕獲紀錄的魚類: {$fishWithImageNotInRecords}");
        $this->line("  總捕獲紀錄數: {$totalRecords}");
        $this->newLine();

        // 詳細分析：圖片未加入捕獲紀錄的魚類
        $fishList = Fish::with('captureRecords')->get()->filter(function ($fish) {
            return !$fish->captureRecords->contains(function ($record) use ($fish) {
                return $record->image_path === $fish->image;
            });
        });
        
        if ($fishList->count() > 0) {
            $this->warn("⚠️  發現 {$fishList->count()} 筆魚類的圖片尚未加入捕獲紀錄：");
            $this->line('--------------------------------------------------');
            
            foreach ($fishList as $fish) {
                $existingRecordsCount = $fish->captureRecords->count();
                $this->line("  Fish ID: {$fish->id}");
                $this->line("    名稱: {$fish->name}");
                $this->line("    圖片: {$fish->image}");
                $this->line("    建立時間: {$fish->created_at}");
                $this->line("    現有捕獲紀錄數: {$existingRecordsCount}");
                if ($existingRecordsCount > 0) {
                    $this->line("    現有紀錄的圖片: " . $fish->captureRecords->pluck('image_path')->implode(', '));
                }
                $this->line('');
            }
            
            $this->newLine();
            $this->info("💡 可執行指令修復: php artisan migrate:legacy-fish");
        } else {
            $this->info("✅ 所有魚類的圖片都已加入捕獲紀錄！");
        }

        $this->newLine();

        // 檢查「系統新增舊資料」的紀錄數量
        $legacyRecords = CaptureRecord::where('notes', '此為系統新增舊資料')->count();
        $this->info("📋 系統自動建立的舊資料紀錄：");
        $this->line("  數量: {$legacyRecords} 筆");
        $this->newLine();

        // 魚類捕獲紀錄分布
        $this->info("📈 魚類捕獲紀錄數量分布：");
        $distribution = Fish::withCount('captureRecords')
            ->get()
            ->groupBy('capture_records_count')
            ->map->count()
            ->sortKeys();

        foreach ($distribution as $recordCount => $fishCount) {
            $label = $recordCount == 0 ? '無紀錄' : "{$recordCount} 筆";
            $this->line("  {$label}: {$fishCount} 條魚");
        }

        $this->newLine();
        return Command::SUCCESS;
    }
}
