<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Admin;
use App\Http\Controllers\SongController;
use Illuminate\Support\Facades\Route;

Route::get('/', [SongController::class, 'indexPage']);
Route::get('/songs/{song}', [SongController::class, 'showPage']);
Route::get('/songs/{song}/reader', [SongController::class, 'readerPage']);

Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'webLogin']);
Route::post('/logout', [AuthController::class, 'webLogout'])->middleware('auth')->name('logout');

Route::middleware(['auth', 'editor.or.admin'])->prefix('admin')->group(function () {
    Route::get('/songs', [Admin\SongController::class, 'indexPage'])->name('admin.songs.index');
    Route::get('/songs/{song}/lyrics', [Admin\SongController::class, 'lyricsPage'])->name('admin.songs.lyrics');

    // admin-only pages
    Route::middleware('admin.only')->group(function () {
        Route::get('/songs/create', [Admin\SongController::class, 'createPage'])->name('admin.songs.create');
        Route::get('/songs/{song}/media', [Admin\SongController::class, 'mediaPage'])->name('admin.songs.media');
        Route::get('/songs/{song}/edit', [Admin\SongController::class, 'editPage'])->name('admin.songs.edit');
        Route::get('/users', [Admin\UserController::class, 'indexPage'])->name('admin.users.index');
        Route::get('/reports', [Admin\ReportController::class, 'index'])->name('admin.reports.index');
    });
});
