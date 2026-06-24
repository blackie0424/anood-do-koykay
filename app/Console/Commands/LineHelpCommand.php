<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class LineHelpCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'line:info';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = '顯示所有與 LINE 相關的 Artisan 指令與操作說明';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('=============================================');
        $this->info('           🐟 達悟族魚類知識平台 🐟          ');
        $this->info('          【 LINE Bot 相關操作指令集 】         ');
        $this->info('=============================================');
        $this->line('');
        
        $commands = [
            [
                'command' => 'php artisan line:setup-rich-menu',
                'description' => '建立 LINE 預設圖文選單。',
                'options' => [
                    '--image=/path/to/img.jpg' => '指定圖文選單圖片路徑 (預設為 public/images/line/rich_menu.jpg)',
                    '--dry-run' => '測試執行，僅顯示設定的 payload，不會實際發送至 LINE API'
                ]
            ],
            // 如果後續有新增其他 line 相關指令，可以在這裡擴充
        ];

        foreach ($commands as $cmd) {
            $this->warn('🚀 指令： ' . $cmd['command']);
            $this->line('   說明： ' . $cmd['description']);
            
            if (isset($cmd['options']) && count($cmd['options']) > 0) {
                $this->line('   可用參數：');
                foreach ($cmd['options'] as $option => $desc) {
                    $this->line("     <info>{$option}</info> : {$desc}");
                }
            }
            $this->line('');
            $this->line('---------------------------------------------');
            $this->line('');
        }

        $this->info('💡 提示：');
        $this->line('  以上指令主要用於從後端 Server (如 EC2) 直接與 LINE API 進行互動。');
        $this->line('  例如圖文選單已經包含了 6 個特製的切分區域與 Payload，強烈建議直接使用');
        $this->line('  上述指令建立，而不是在 LINE Official Account Manager 後台手動拉框設定。');
        $this->line('');
    }
}
