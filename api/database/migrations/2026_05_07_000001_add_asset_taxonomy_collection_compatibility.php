<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('assets') && !Schema::hasColumn('assets', 'kind')) {
            Schema::table('assets', function (Blueprint $table): void {
                $table->string('kind', 32)->default('other')->after('type');
                $table->index(['user_id', 'kind']);
            });
        }

        if (!Schema::hasTable('asset_collections')) {
            Schema::create('asset_collections', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('slug');
                $table->text('description')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'slug']);
            });
        }

        if (!Schema::hasTable('asset_collection_items')) {
            Schema::create('asset_collection_items', function (Blueprint $table): void {
                $table->foreignId('asset_collection_id')->constrained()->cascadeOnDelete();
                $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
                $table->timestamps();

                $table->primary(['asset_collection_id', 'asset_id']);
                $table->index('asset_id');
            });
        }

        if (!Schema::hasTable('asset_collection_targets')) {
            Schema::create('asset_collection_targets', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('asset_collection_id')->constrained()->cascadeOnDelete();
                $table->string('target_type', 32);
                $table->unsignedBigInteger('target_id');
                $table->timestamps();

                $table->unique(['asset_collection_id', 'target_type', 'target_id'], 'asset_collection_targets_unique');
                $table->index(['target_type', 'target_id']);
                $table->index(['user_id', 'target_type', 'target_id']);
            });
        }

        if (!Schema::hasTable('asset_folders')) {
            Schema::create('asset_folders', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('slug');
                $table->timestamps();

                $table->unique(['user_id', 'slug']);
            });
        }

        if (Schema::hasTable('assets') && !Schema::hasColumn('assets', 'asset_folder_id')) {
            Schema::table('assets', function (Blueprint $table): void {
                $table->foreignId('asset_folder_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
                $table->index(['user_id', 'asset_folder_id']);
            });
        }

        if (
            Schema::hasTable('asset_folders') &&
            Schema::hasTable('asset_collections') &&
            Schema::hasTable('asset_collection_items') &&
            Schema::hasTable('assets')
        ) {
            DB::table('asset_collections')
                ->orderBy('id')
                ->chunkById(100, function ($collections): void {
                    foreach ($collections as $collection) {
                        $exists = DB::table('asset_folders')
                            ->where('user_id', $collection->user_id)
                            ->where('slug', $collection->slug)
                            ->exists();

                        if (!$exists) {
                            DB::table('asset_folders')->insert([
                                'user_id' => $collection->user_id,
                                'name' => $collection->name,
                                'slug' => $collection->slug,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                });

            DB::table('assets')
                ->whereNull('asset_folder_id')
                ->orderBy('id')
                ->chunkById(100, function ($assets): void {
                    foreach ($assets as $asset) {
                        $collection = DB::table('asset_collection_items')
                            ->join('asset_collections', 'asset_collection_items.asset_collection_id', '=', 'asset_collections.id')
                            ->where('asset_collection_items.asset_id', $asset->id)
                            ->orderBy('asset_collections.id')
                            ->select('asset_collections.user_id', 'asset_collections.slug')
                            ->first();

                        if (!$collection) {
                            continue;
                        }

                        $folderId = DB::table('asset_folders')
                            ->where('user_id', $collection->user_id)
                            ->where('slug', $collection->slug)
                            ->value('id');

                        if ($folderId) {
                            DB::table('assets')
                                ->where('id', $asset->id)
                                ->update(['asset_folder_id' => $folderId]);
                        }
                    }
                });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('assets') && Schema::hasColumn('assets', 'asset_folder_id')) {
            Schema::table('assets', function (Blueprint $table): void {
                $table->dropIndex(['user_id', 'asset_folder_id']);
                $table->dropConstrainedForeignId('asset_folder_id');
            });
        }

        Schema::dropIfExists('asset_collection_targets');
        Schema::dropIfExists('asset_collection_items');
        Schema::dropIfExists('asset_collections');
        Schema::dropIfExists('asset_folders');

        if (Schema::hasTable('assets') && Schema::hasColumn('assets', 'kind')) {
            Schema::table('assets', function (Blueprint $table): void {
                $table->dropIndex(['user_id', 'kind']);
                $table->dropColumn('kind');
            });
        }
    }
};
