<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        $ttl = config('audio.pending_ttl', 3600);
        $schedule->command('audio:purge-pending', ["--ttl={$ttl}"])->hourly();
    }

    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
    }
}
