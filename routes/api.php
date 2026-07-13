<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SongController;
use App\Http\Controllers\Admin;
use Illuminate\Support\Facades\Route;

Route::get('/health-check', fn() => response()->json(['status' => 'ok']));

Route::get('/songs', [SongController::class, 'index']);
Route::get('/songs/{song}', [SongController::class, 'show']);

Route::post('/admin/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'editor.or.admin'])->group(function () {
    Route::post('/admin/logout', [AuthController::class, 'logout']);
    Route::get('/admin/me', [AuthController::class, 'me']);

    // admin only
    Route::middleware('admin.only')->group(function () {
        Route::apiResource('admin/songs', Admin\SongController::class);
        Route::post('/admin/songs/{song}/scores', [Admin\ScoreController::class, 'store']);
        Route::delete('/admin/songs/{song}/scores/{score}', [Admin\ScoreController::class, 'destroy']);
        Route::put('/admin/songs/{song}/scores/reorder', [Admin\ScoreController::class, 'reorder']);
        Route::post('/admin/songs/{song}/scores/{score}/reocr', [Admin\ScoreController::class, 'reOcr']);
        Route::post('/admin/songs/{song}/score', [Admin\MediaController::class, 'uploadScore']);
        Route::post('/admin/songs/{song}/score/reocr', [Admin\MediaController::class, 'reOcr']);
        Route::post('/admin/songs/{song}/lines/batch', [Admin\SongLineController::class, 'batchStore']);
        Route::put('/admin/songs/{song}/lines/{line}/mark-time', [Admin\SongLineController::class, 'markTime']);
        Route::post('/admin/songs/{song}/audio', [Admin\MediaController::class, 'uploadAudio']);
        Route::post('/admin/users', [Admin\UserController::class, 'store']);
    });
});
