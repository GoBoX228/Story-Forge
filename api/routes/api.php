<?php

use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Auth\SessionController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Admin\AdminBroadcastsController;
use App\Http\Controllers\Admin\AdminContentController;
use App\Http\Controllers\Admin\AdminLogsController;
use App\Http\Controllers\Admin\AdminOverviewController;
use App\Http\Controllers\Admin\AdminReportsController;
use App\Http\Controllers\Admin\AdminUsersController;
use App\Http\Controllers\BroadcastController;
use App\Http\Controllers\BlockController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\ChapterController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ScenarioController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('/register', [SessionController::class, 'register']);
    Route::post('/login', [SessionController::class, 'login']);
    Route::post('/password/forgot', [PasswordController::class, 'forgotPassword']);
    Route::post('/password/reset', [PasswordController::class, 'resetPassword']);
    Route::post('/2fa/verify', [TwoFactorController::class, 'verifyTwoFactor']);
    Route::post('/2fa/resend', [TwoFactorController::class, 'resendTwoFactorCode']);
    Route::post('/refresh', [SessionController::class, 'refresh']);
    Route::post('/logout', [SessionController::class, 'logout'])->middleware('auth:sanctum');
});

Route::middleware(['auth:sanctum', 'active_user'])->group(function () {
    Route::get('/me', [ProfileController::class, 'me']);
    Route::patch('/me', [ProfileController::class, 'updateMe']);
    Route::post('/auth/password/change', [PasswordController::class, 'changePassword']);
    Route::post('/auth/2fa/enable', [TwoFactorController::class, 'requestEnableTwoFactor']);
    Route::post('/auth/2fa/enable/confirm', [TwoFactorController::class, 'confirmEnableTwoFactor']);
    Route::post('/auth/2fa/disable', [TwoFactorController::class, 'requestDisableTwoFactor']);
    Route::post('/auth/2fa/disable/confirm', [TwoFactorController::class, 'confirmDisableTwoFactor']);

    Route::get('/campaigns', [CampaignController::class, 'index']);
    Route::post('/campaigns', [CampaignController::class, 'store']);
    Route::get('/campaigns/{id}', [CampaignController::class, 'show']);
    Route::patch('/campaigns/{id}', [CampaignController::class, 'update']);
    Route::delete('/campaigns/{id}', [CampaignController::class, 'destroy']);

    Route::get('/scenarios', [ScenarioController::class, 'index']);
    Route::post('/scenarios', [ScenarioController::class, 'store']);
    Route::get('/scenarios/{id}', [ScenarioController::class, 'show']);
    Route::patch('/scenarios/{id}', [ScenarioController::class, 'update']);
    Route::delete('/scenarios/{id}', [ScenarioController::class, 'destroy']);

    Route::post('/scenarios/{id}/chapters', [ChapterController::class, 'store']);
    Route::patch('/chapters/{id}', [ChapterController::class, 'update']);
    Route::delete('/chapters/{id}', [ChapterController::class, 'destroy']);

    Route::post('/chapters/{id}/blocks', [BlockController::class, 'store']);
    Route::patch('/blocks/{id}', [BlockController::class, 'update']);
    Route::delete('/blocks/{id}', [BlockController::class, 'destroy']);
    Route::post('/blocks/{id}/reorder', [BlockController::class, 'reorder']);

    Route::get('/maps', [MapController::class, 'index']);
    Route::post('/maps', [MapController::class, 'store']);
    Route::get('/maps/{id}', [MapController::class, 'show']);
    Route::patch('/maps/{id}', [MapController::class, 'update']);
    Route::delete('/maps/{id}', [MapController::class, 'destroy']);

    Route::post('/characters', [CharacterController::class, 'store']);
    Route::get('/characters', [CharacterController::class, 'index']);
    Route::patch('/characters/{id}', [CharacterController::class, 'update']);
    Route::delete('/characters/{id}', [CharacterController::class, 'destroy']);

    Route::get('/items', [ItemController::class, 'index']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::get('/items/{id}', [ItemController::class, 'show']);
    Route::patch('/items/{id}', [ItemController::class, 'update']);
    Route::delete('/items/{id}', [ItemController::class, 'destroy']);

    Route::post('/reports', [ReportController::class, 'store']);
    Route::get('/broadcasts', [BroadcastController::class, 'index']);

    Route::post('/scenarios/{id}/export/pdf', [ExportController::class, 'exportScenarioPdf']);

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/overview', [AdminOverviewController::class, 'overview']);
        Route::get('/users', [AdminUsersController::class, 'index']);
        Route::patch('/users/{id}', [AdminUsersController::class, 'update']);
        Route::get('/reports', [AdminReportsController::class, 'index']);
        Route::patch('/reports/{id}', [AdminReportsController::class, 'update']);
        Route::get('/content', [AdminContentController::class, 'index']);
        Route::delete('/content/{type}/{id}', [AdminContentController::class, 'destroy']);
        Route::get('/broadcasts', [AdminBroadcastsController::class, 'index']);
        Route::post('/broadcasts', [AdminBroadcastsController::class, 'store']);
        Route::get('/logs', [AdminLogsController::class, 'index']);
    });
});
