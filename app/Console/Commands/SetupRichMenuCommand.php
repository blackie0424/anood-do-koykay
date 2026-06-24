<?php

namespace App\Console\Commands;

use App\Contracts\RichMenuServiceInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SetupRichMenuCommand extends Command
{
    protected $signature = 'line:setup-rich-menu
                            {--viewer-image= : 一般瀏覽者選單圖片路徑（預設 public/images/line/rich_menu_viewer.png）}
                            {--editor-image= : 編輯者選單圖片路徑（預設 public/images/line/rich_menu_editor.png）}
                            {--dry-run : 只顯示設定內容，不實際建立}';

    protected $description = '建立 LINE 雙圖文選單（viewer / editor），viewer 為全域預設，editor 供有角色使用者綁定';

    public function __construct(
        protected RichMenuServiceInterface $richMenuService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        if (empty(config('line.channel_access_token'))) {
            $this->error('LINE Channel Access Token 未設定，請檢查 .env 的 LINE_CHANNEL_ACCESS_TOKEN');
            return Command::FAILURE;
        }

        $viewerMenuData = $this->buildViewerMenuData();
        $editorMenuData = $this->buildEditorMenuData();

        if ($this->option('dry-run')) {
            $this->info('=== Dry Run：Viewer Menu ===');
            $this->line(json_encode($viewerMenuData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $this->info('=== Dry Run：Editor Menu ===');
            $this->line(json_encode($editorMenuData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return Command::SUCCESS;
        }

        $this->info('🚀 開始建立 LINE 雙圖文選單...');

        try {
            // 步驟 1：刪除所有舊選單
            $this->info('  刪除現有圖文選單...');
            $this->richMenuService->deleteAll();

            // 步驟 2：建立 viewer 選單（一般瀏覽者）
            $this->info('  建立 viewer 選單...');
            $viewerMenuId = $this->richMenuService->create($viewerMenuData);
            $this->info("  ✅ viewer 選單 ID：{$viewerMenuId}");

            $viewerImage = $this->option('viewer-image') ?? public_path('images/line/rich_menu_viewer.png');
            if (!file_exists($viewerImage)) {
                $this->warn("  ⚠️  找不到 viewer 圖片：{$viewerImage}，跳過上傳");
            } else {
                $this->richMenuService->uploadImage($viewerMenuId, $viewerImage);
                $this->info('  ✅ viewer 圖片上傳成功');
            }

            // 步驟 3：建立 editor 選單（田調人員 / admin）
            $this->info('  建立 editor 選單...');
            $editorMenuId = $this->richMenuService->create($editorMenuData);
            $this->info("  ✅ editor 選單 ID：{$editorMenuId}");

            $editorImage = $this->option('editor-image') ?? public_path('images/line/rich_menu_editor.png');
            if (!file_exists($editorImage)) {
                $this->warn("  ⚠️  找不到 editor 圖片：{$editorImage}，跳過上傳");
            } else {
                $this->richMenuService->uploadImage($editorMenuId, $editorImage);
                $this->info('  ✅ editor 圖片上傳成功');
            }

            // 步驟 4：設定 viewer 為全域預設
            $this->richMenuService->setDefault($viewerMenuId);
            $this->richMenuService->linkToAll($viewerMenuId);
            $this->info('  ✅ viewer 選單已設為全域預設');

            $this->info('');
            $this->info('🎉 雙圖文選單建立完成！');
            $this->info("   Viewer Menu ID: {$viewerMenuId}");
            $this->info("   Editor Menu ID: {$editorMenuId}");
            $this->info('');
            $this->info('📝 請將以下設定加入 .env：');
            $this->info("   LINE_VIEWER_RICH_MENU_ID={$viewerMenuId}");
            $this->info("   LINE_EDITOR_RICH_MENU_ID={$editorMenuId}");
            $this->info('');
            $this->info('   ⚠️  user/all 綁定為非同步作業，約 1~2 分鐘後生效');

            Log::info('SetupRichMenuCommand completed', [
                'viewerMenuId' => $viewerMenuId,
                'editorMenuId' => $editorMenuId,
            ]);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ 建立圖文選單失敗：' . $e->getMessage());
            Log::error('SetupRichMenuCommand failed', ['error' => $e->getMessage()]);
            return Command::FAILURE;
        }
    }

    /**
     * Viewer 選單：只有「瀏覽魚類」一個按鈕（全寬）
     */
    protected function buildViewerMenuData(): array
    {
        return [
            'size' => ['width' => 1200, 'height' => 405],
            'selected' => true,
            'name' => '魚類圖鑑 - 瀏覽',
            'chatBarText' => '選單 🐟',
            'areas' => [
                [
                    'bounds' => ['x' => 0, 'y' => 0, 'width' => 1200, 'height' => 405],
                    'action' => [
                        'type' => 'postback',
                        'label' => '瀏覽魚類',
                        'data' => 'action=browse_tribes_menu',
                        'displayText' => '瀏覽魚類 🔍',
                    ],
                ],
            ],
        ];
    }

    /**
     * Editor 選單：三格（新增魚類、瀏覽魚類、提供線索）
     */
    protected function buildEditorMenuData(): array
    {
        return [
            'size' => ['width' => 1200, 'height' => 405],
            'selected' => true,
            'name' => '魚類資料與回報',
            'chatBarText' => '選單 🐟',
            'areas' => [
                [
                    'bounds' => ['x' => 0, 'y' => 0, 'width' => 400, 'height' => 405],
                    'action' => [
                        'type' => 'postback',
                        'label' => '新增魚類',
                        'data' => 'action=start_create_fish',
                        'displayText' => '新增魚類 ➕',
                    ],
                ],
                [
                    'bounds' => ['x' => 400, 'y' => 0, 'width' => 400, 'height' => 405],
                    'action' => [
                        'type' => 'postback',
                        'label' => '瀏覽魚類',
                        'data' => 'action=browse_tribes_menu',
                        'displayText' => '瀏覽魚類 🔍',
                    ],
                ],
                [
                    'bounds' => ['x' => 800, 'y' => 0, 'width' => 400, 'height' => 405],
                    'action' => [
                        'type' => 'postback',
                        'label' => '提供線索',
                        'data' => 'action=provide_clue',
                        'displayText' => '提供線索 💡',
                    ],
                ],
            ],
        ];
    }
}
