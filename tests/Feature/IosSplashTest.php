<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class IosSplashTest extends TestCase
{
    use RefreshDatabase;

    public static function splashSizes(): array
    {
        return [
            'iPhone SE (3rd)' => ['(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)', '/icons/splash/splash-750x1334.png'],
            'iPhone 12/13/14' => ['(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)', '/icons/splash/splash-1170x2532.png'],
            'iPhone 14 Plus' => ['(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)', '/icons/splash/splash-1284x2778.png'],
            'iPhone 14 Pro/15/15 Pro' => ['(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)', '/icons/splash/splash-1179x2556.png'],
            'iPhone 14 Pro Max/15 Plus/15 Pro Max' => ['(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)', '/icons/splash/splash-1290x2796.png'],
            'iPad Air/Pro 11"' => ['(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)', '/icons/splash/splash-1668x2388.png'],
            'iPad Pro 12.9"' => ['(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)', '/icons/splash/splash-2048x2732.png'],
        ];
    }

    #[DataProvider('splashSizes')]
    public function test_apple_touch_startup_image_link_present(string $media, string $href): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee(
                '<link rel="apple-touch-startup-image" media="'.$media.'" href="'.$href.'">',
                false,
            );
    }

    public function test_splash_image_files_exist_on_disk(): void
    {
        foreach (self::splashSizes() as [, $href]) {
            $this->assertFileExists(public_path($href), "缺少 splash image: {$href}");
        }
    }
}
