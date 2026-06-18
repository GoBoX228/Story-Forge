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
use App\Http\Controllers\AssetCollectionController;
use App\Http\Controllers\AssetCollectionTargetController;
use App\Http\Controllers\AssetFolderController;
use App\Http\Controllers\BroadcastController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CharacterController;
use App\Http\Controllers\CharacterGroupController;
use App\Http\Controllers\ChronicleController;
use App\Http\Controllers\EntityLinkController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\FactionController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\ItemGroupController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\PublicationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ScenarioController;
use App\Http\Controllers\ScenarioGroupController;
use App\Http\Controllers\ScenarioNodeEntityLinkController;
use App\Http\Controllers\ScenarioNodeController;
use App\Http\Controllers\ScenarioTransitionController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\SystemTileController;
use App\Http\Controllers\WorldEventController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::get('/csrf', [SessionController::class, 'csrf'])->middleware('throttle:auth-refresh');
    Route::post('/register', [SessionController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('/login', [SessionController::class, 'login'])->middleware('throttle:auth-login');
    Route::post('/password/forgot', [PasswordController::class, 'forgotPassword'])->middleware('throttle:auth-password');
    Route::post('/password/reset', [PasswordController::class, 'resetPassword'])->middleware('throttle:auth-password');
    Route::post('/2fa/verify', [TwoFactorController::class, 'verifyTwoFactor'])->middleware('throttle:auth-2fa');
    Route::post('/2fa/resend', [TwoFactorController::class, 'resendTwoFactorCode'])->middleware('throttle:auth-2fa');
    Route::post('/refresh', [SessionController::class, 'refresh'])->middleware(['throttle:auth-refresh', 'csrf_cookie:always']);
    Route::post('/logout', [SessionController::class, 'logout'])->middleware(['cookie_auth', 'csrf_cookie:always']);
});

Route::middleware(['cookie_auth', 'active_user', 'csrf_cookie'])->group(function () {
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
    Route::post('/campaigns/{id}/export/zip', [ExportController::class, 'exportCampaignZip'])->middleware('throttle:campaign-export');
    Route::get('/export-jobs/{id}', [ExportController::class, 'exportJobStatus']);
    Route::get('/export-jobs/{id}/download', [ExportController::class, 'downloadExportJob']);

    Route::get('/scenarios', [ScenarioController::class, 'index']);
    Route::post('/scenarios', [ScenarioController::class, 'store']);
    Route::get('/scenarios/{id}', [ScenarioController::class, 'show']);
    Route::patch('/scenarios/{id}', [ScenarioController::class, 'update']);
    Route::delete('/scenarios/{id}', [ScenarioController::class, 'destroy']);

    Route::get('/scenario-groups', [ScenarioGroupController::class, 'index']);
    Route::post('/scenario-groups', [ScenarioGroupController::class, 'store']);
    Route::get('/scenario-groups/{id}', [ScenarioGroupController::class, 'show']);
    Route::patch('/scenario-groups/{id}', [ScenarioGroupController::class, 'update']);
    Route::delete('/scenario-groups/{id}', [ScenarioGroupController::class, 'destroy']);

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
    Route::post('/maps/{id}/export/pdf', [ExportController::class, 'exportMapPdf'])->middleware('throttle:pdf-export');

    Route::post('/characters', [CharacterController::class, 'store']);
    Route::get('/characters', [CharacterController::class, 'index']);
    Route::patch('/characters/{id}', [CharacterController::class, 'update']);
    Route::delete('/characters/{id}', [CharacterController::class, 'destroy']);
    Route::get('/character-groups', [CharacterGroupController::class, 'index']);
    Route::post('/character-groups', [CharacterGroupController::class, 'store']);
    Route::get('/character-groups/{id}', [CharacterGroupController::class, 'show']);
    Route::patch('/character-groups/{id}', [CharacterGroupController::class, 'update']);
    Route::delete('/character-groups/{id}', [CharacterGroupController::class, 'destroy']);

    Route::get('/items', [ItemController::class, 'index']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::get('/items/{id}', [ItemController::class, 'show']);
    Route::patch('/items/{id}', [ItemController::class, 'update']);
    Route::delete('/items/{id}', [ItemController::class, 'destroy']);
    Route::get('/item-groups', [ItemGroupController::class, 'index']);
    Route::post('/item-groups', [ItemGroupController::class, 'store']);
    Route::get('/item-groups/{id}', [ItemGroupController::class, 'show']);
    Route::patch('/item-groups/{id}', [ItemGroupController::class, 'update']);
    Route::delete('/item-groups/{id}', [ItemGroupController::class, 'destroy']);

    Route::get('/assets', [AssetController::class, 'index']);
    Route::get('/system-tiles', [SystemTileController::class, 'index']);
    Route::post('/assets', [AssetController::class, 'store'])->middleware('throttle:asset-upload');
    Route::get('/assets/{id}', [AssetController::class, 'show']);
    Route::patch('/assets/{id}', [AssetController::class, 'update']);
    Route::delete('/assets/{id}', [AssetController::class, 'destroy']);

    Route::get('/asset-folders', [AssetFolderController::class, 'index']);
    Route::post('/asset-folders', [AssetFolderController::class, 'store']);
    Route::get('/asset-folders/{id}', [AssetFolderController::class, 'show']);
    Route::patch('/asset-folders/{id}', [AssetFolderController::class, 'update']);
    Route::delete('/asset-folders/{id}', [AssetFolderController::class, 'destroy']);

    Route::get('/asset-collections', [AssetCollectionController::class, 'index']);
    Route::post('/asset-collections', [AssetCollectionController::class, 'store']);
    Route::get('/asset-collections/{id}', [AssetCollectionController::class, 'show']);
    Route::patch('/asset-collections/{id}', [AssetCollectionController::class, 'update']);
    Route::delete('/asset-collections/{id}', [AssetCollectionController::class, 'destroy']);
    Route::get('/asset-collection-targets/{type}/{id}/collections', [AssetCollectionTargetController::class, 'targetCollections']);
    Route::put('/asset-collection-targets/{type}/{id}/collections', [AssetCollectionTargetController::class, 'replaceTargetCollections']);

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

    Route::get('/chronicles', [ChronicleController::class, 'index']);
    Route::post('/chronicles', [ChronicleController::class, 'store']);
    Route::get('/chronicles/{id}', [ChronicleController::class, 'show']);
    Route::patch('/chronicles/{id}', [ChronicleController::class, 'update']);
    Route::delete('/chronicles/{id}', [ChronicleController::class, 'destroy']);

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

    Route::post('/reports', [ReportController::class, 'store'])->middleware('throttle:reports');
    Route::get('/broadcasts', [BroadcastController::class, 'index']);

    Route::post('/scenarios/{id}/export/pdf', [ExportController::class, 'exportScenarioPdf'])->middleware('throttle:pdf-export');
    Route::post('/scenarios/{id}/export/characters/pdf', [ExportController::class, 'exportScenarioCharacterCardsPdf'])->middleware('throttle:pdf-export');
    Route::post('/scenarios/{id}/export/items/pdf', [ExportController::class, 'exportScenarioItemCardsPdf'])->middleware('throttle:pdf-export');

    Route::prefix('admin')->middleware(['admin', 'throttle:admin'])->group(function () {
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
