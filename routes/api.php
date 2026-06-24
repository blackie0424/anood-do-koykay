<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SongController;
use App\Http\Controllers\Admin;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health-check', fn() => response()->json(['status' => 'ok']));

// =====================================================
// 公開路由
// =====================================================
Route::get('/songs', [SongController::class, 'index']);
Route::get('/songs/{song}', [SongController::class, 'show']);

// =====================================================
// 後台認證
// =====================================================
Route::post('/admin/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/admin/logout', [AuthController::class, 'logout']);
    Route::get('/admin/me', [AuthController::class, 'me']);

    // 歌曲管理
    Route::apiResource('admin/songs', Admin\SongController::class);

    // 歌詞管理
    Route::post('/admin/songs/{song}/lines/batch', [Admin\SongLineController::class, 'batchStore']);
    Route::put('/admin/songs/{song}/lines/{line}/mark-time', [Admin\SongLineController::class, 'markTime']);

    // 媒體上傳
    Route::post('/admin/songs/{song}/score', [Admin\MediaController::class, 'uploadScore']);
    Route::post('/admin/songs/{song}/audio', [Admin\MediaController::class, 'uploadAudio']);
});
