<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SongController;
use App\Http\Controllers\Admin;
use Illuminate\Support\Facades\Route;

Route::get('/health-check', fn() => response()->json(['status' => 'ok']));

Route::get('/songs', [SongController::class, 'index']);
Route::get('/songs/{song}', [SongController::class, 'show']);

Route::post('/admin/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/admin/logout', [AuthController::class, 'logout']);
    Route::get('/admin/me', [AuthController::class, 'me']);

    Route::apiResource('admin/songs', Admin\SongController::class);
    Route::post('/admin/songs/{song}/lines/batch', [Admin\SongLineController::class, 'batchStore']);
    Route::put('/admin/songs/{song}/lines/{line}/mark-time', [Admin\SongLineController::class, 'markTime']);
    Route::post('/admin/songs/{song}/score', [Admin\MediaController::class, 'uploadScore']);
    Route::post('/admin/songs/{song}/score/reocr', [Admin\MediaController::class, 'reOcr']);
    Route::post('/admin/songs/{song}/audio', [Admin\MediaController::class, 'uploadAudio']);
});
