<?php
namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorageService
{
    public function uploadFile(UploadedFile $file, string $folder): string
    {
        $ext = $file->getClientOriginalExtension();
        $filename = Str::uuid() . '.' . $ext;
        $path = "{$folder}/{$filename}";

        Storage::disk('r2')->put($path, file_get_contents($file->getRealPath()), 'public');

        return Storage::disk('r2')->url($path);
    }

    public function delete(string $url): void
    {
        $path = parse_url($url, PHP_URL_PATH);
        Storage::disk('r2')->delete(ltrim($path, '/'));
    }
}
