<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\PurgeService;

class PurgePendingAudio extends Command
{
    protected $signature = 'audio:purge-pending {--ttl=3600 : TTL seconds to keep pending files}';
    protected $description = 'Purge pending/audio files older than TTL seconds.';

    public function handle(PurgeService $purge)
    {
        $ttl = (int) $this->option('ttl');
        $olderThan = time() - max(1, $ttl);
        $count = $purge->purgePendingOlderThan($olderThan);
        $this->info("Purged {$count} pending files older than {$ttl}s");
        return self::SUCCESS;
    }
}
