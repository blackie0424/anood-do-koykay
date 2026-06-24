<?php

namespace App\Providers;

use App\Contracts\FishStatisticsServiceInterface;
use App\Contracts\FishServiceInterface;
use App\Contracts\FishSearchServiceInterface;
use App\Contracts\LineMessagingClientInterface;
use App\Contracts\LineUserServiceInterface;
use App\Contracts\CaptureSessionServiceInterface;
use App\Contracts\RichMenuServiceInterface;
use App\Contracts\StorageServiceInterface;
use App\Services\FishService;
use App\Services\FishSearchService;
use App\Services\FishStatisticsService;
use App\Services\Line\LineMessagingClient;
use App\Services\LineUserService;
use App\Services\CaptureSessionService;
use App\Services\RichMenuService;
use App\Services\S3StorageService;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(StorageServiceInterface::class, S3StorageService::class);

        // LINE 角色機制服務綁定
        $this->app->bind(RichMenuServiceInterface::class, RichMenuService::class);
        $this->app->bind(LineUserServiceInterface::class, LineUserService::class);
        $this->app->bind(LineMessagingClientInterface::class, LineMessagingClient::class);

        // 魚類統計報告服務綁定
        $this->app->bind(FishStatisticsServiceInterface::class, FishStatisticsService::class);

        // 魚類服務 DIP 綁定
        $this->app->bind(FishServiceInterface::class, FishService::class);
        $this->app->bind(FishSearchServiceInterface::class, FishSearchService::class);

        // 捕獲資訊組合服務綁定
        $this->app->bind(CaptureSessionServiceInterface::class, CaptureSessionService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 生產環境強制使用 HTTPS 協定
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
