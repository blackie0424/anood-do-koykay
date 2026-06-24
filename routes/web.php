<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\Admin;
use App\Http\Controllers\SongController;
use Illuminate\Support\Facades\Route;

Route::get('/', [SongController::class, 'indexPage']);
Route::get('/songs/{song}', [SongController::class, 'showPage']);

Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'webLogin']);
Route::post('/logout', [AuthController::class, 'webLogout'])->middleware('auth')->name('logout');

Route::middleware('auth')->prefix('admin')->group(function () {
    Route::get('/songs', [Admin\SongController::class, 'indexPage'])->name('admin.songs.index');
    Route::get('/songs/create', [Admin\SongController::class, 'createPage'])->name('admin.songs.create');
    Route::get('/songs/{song}/edit', [Admin\SongController::class, 'editPage'])->name('admin.songs.edit');
    Route::post('/songs', [Admin\SongController::class, 'webStore'])->name('admin.songs.store');
    Route::put('/songs/{song}', [Admin\SongController::class, 'webUpdate'])->name('admin.songs.update');
    Route::delete('/songs/{song}', [Admin\SongController::class, 'webDestroy'])->name('admin.songs.destroy');
});
