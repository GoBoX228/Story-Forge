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
use App\Http\Controllers\AssetController;
use App\Http\Controllers\BroadcastController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\EntityLinkController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\FactionController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\PublicationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ScenarioController;
use App\Http\Controllers\ScenarioNodeEntityLinkController;
use App\Http\Controllers\ScenarioNodeController;
use App\Http\Controllers\ScenarioTransitionController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\WorldEventController;
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

    Route::get('/scenarios/{id}/nodes', [ScenarioNodeController::class, 'index']);
    Route::post('/scenarios/{id}/nodes', [ScenarioNodeController::class, 'store']);
    Route::patch('/scenario-nodes/{id}', [ScenarioNodeController::class, 'update']);
    Route::delete('/scenario-nodes/{id}', [ScenarioNodeController::class, 'destroy']);
    Route::get('/scenario-nodes/{id}/entity-links', [ScenarioNodeEntityLinkController::class, 'index']);
    Route::post('/scenario-nodes/{id}/entity-links', [ScenarioNodeEntityLinkController::class, 'store']);
    Route::delete('/scenario-node-entity-links/{id}', [ScenarioNodeEntityLinkController::class, 'destroy']);

    Route::get('/scenarios/{id}/transitions', [ScenarioTransitionController::class, 'index']);
    Route::post('/scenarios/{id}/transitions', [ScenarioTransitionController::class, 'store']);
    Route::patch('/scenario-transitions/{id}', [ScenarioTransitionController::class, 'update']);
    Route::delete('/scenario-transitions/{id}', [ScenarioTransitionController::class, 'destroy']);

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

    Route::get('/assets', [AssetController::class, 'index']);
    Route::post('/assets', [AssetController::class, 'store']);
    Route::get('/assets/{id}', [AssetController::class, 'show']);
    Route::patch('/assets/{id}', [AssetController::class, 'update']);
    Route::delete('/assets/{id}', [AssetController::class, 'destroy']);

    Route::get('/locations', [LocationController::class, 'index']);
    Route::post('/locations', [LocationController::class, 'store']);
    Route::get('/locations/{id}', [LocationController::class, 'show']);
    Route::patch('/locations/{id}', [LocationController::class, 'update']);
    Route::delete('/locations/{id}', [LocationController::class, 'destroy']);

    Route::get('/factions', [FactionController::class, 'index']);
    Route::post('/factions', [FactionController::class, 'store']);
    Route::get('/factions/{id}', [FactionController::class, 'show']);
    Route::patch('/factions/{id}', [FactionController::class, 'update']);
    Route::delete('/factions/{id}', [FactionController::class, 'destroy']);

    Route::get('/events', [WorldEventController::class, 'index']);
    Route::post('/events', [WorldEventController::class, 'store']);
    Route::get('/events/{id}', [WorldEventController::class, 'show']);
    Route::patch('/events/{id}', [WorldEventController::class, 'update']);
    Route::delete('/events/{id}', [WorldEventController::class, 'destroy']);

    Route::get('/tags', [TagController::class, 'index']);
    Route::post('/tags', [TagController::class, 'store']);
    Route::patch('/tags/{id}', [TagController::class, 'update']);
    Route::delete('/tags/{id}', [TagController::class, 'destroy']);
    Route::get('/tag-targets/{type}/{id}/tags', [TagController::class, 'targetTags']);
    Route::put('/tag-targets/{type}/{id}/tags', [TagController::class, 'replaceTargetTags']);

    Route::get('/entity-links/{sourceType}/{sourceId}', [EntityLinkController::class, 'index']);
    Route::post('/entity-links/{sourceType}/{sourceId}', [EntityLinkController::class, 'store']);
    Route::patch('/entity-links/{id}', [EntityLinkController::class, 'update']);
    Route::delete('/entity-links/{id}', [EntityLinkController::class, 'destroy']);

    Route::get('/publications', [PublicationController::class, 'index']);
    Route::get('/publications/{slug}', [PublicationController::class, 'show']);
    Route::post('/publication-targets/{type}/{id}', [PublicationController::class, 'storeForTarget']);
    Route::patch('/publications/{id}', [PublicationController::class, 'update']);
    Route::delete('/publications/{id}', [PublicationController::class, 'destroy']);

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
