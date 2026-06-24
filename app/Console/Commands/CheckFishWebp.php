<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Contracts\StorageServiceInterface;
use App\Models\Fish;

class CheckFishWebp extends Command
{
    protected $signature = 'fish:check-webp';

    protected $description = '定期檢查所有 fish 物件的 webp 檔案是否存在，並更新 has_webp 欄位';

    public function __construct(private readonly StorageServiceInterface $storage)
    {
        parent::__construct();
    }

    public function handle()
    {
        $webpFolder = $this->storage->getWebpFolder();

        Fish::chunk(50, function ($fishes) use ($webpFolder) {
            foreach ($fishes as $fish) {
                if (!$fish->image) {
                    continue;
                }

                $baseName = pathinfo($fish->image, PATHINFO_FILENAME);
                $webpPath = $webpFolder . '/' . $baseName . '.webp';
                $hasWebp = $this->storage->fileExists($webpPath);

                if ($fish->has_webp !== $hasWebp) {
                    $fish->has_webp = $hasWebp;
                    $fish->save();
                }
            }
        });

        $this->info('webp 狀態檢查完成');
    }
}
