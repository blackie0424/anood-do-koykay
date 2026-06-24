<?php
use App\Http\Controllers\SongController;
use App\Http\Controllers\Admin;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public pages
Route::get('/', [SongController::class, 'indexPage']);
Route::get('/songs/{song}', [SongController::class, 'showPage']);

// Auth
Route::get('/login', fn() => Inertia::render('Auth/Login'))->name('login');
Route::post('/login', [AuthController::class, 'webLogin']);
Route::post('/logout', [AuthController::class, 'webLogout'])->middleware('auth')->name('logout');

// Admin pages (session auth)
Route::middleware('auth')->prefix('admin')->group(function () {
    Route::get('/songs', [Admin\SongController::class, 'indexPage'])->name('admin.songs.index');
    Route::get('/songs/create', [Admin\SongController::class, 'createPage'])->name('admin.songs.create');
    Route::get('/songs/{song}/edit', [Admin\SongController::class, 'editPage'])->name('admin.songs.edit');
});
