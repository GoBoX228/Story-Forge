<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['campaign_id', 'updated_at']);
        });

        Schema::create('factions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['campaign_id', 'updated_at']);
        });

        Schema::create('events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['campaign_id', 'starts_at']);
        });

        Schema::create('entity_links', function (Blueprint $table): void {
            $table->id();
            $table->string('source_type', 64);
            $table->unsignedBigInteger('source_id');
            $table->string('target_type', 64);
            $table->unsignedBigInteger('target_id');
            $table->string('relation_type', 64);
            $table->string('label')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['source_type', 'source_id']);
            $table->index(['target_type', 'target_id']);
            $table->index('relation_type');
        });

        Schema::create('tags', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->timestamps();

            $table->unique(['user_id', 'slug']);
        });

        Schema::create('taggables', function (Blueprint $table): void {
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->string('taggable_type', 64);
            $table->unsignedBigInteger('taggable_id');

            $table->primary(['tag_id', 'taggable_type', 'taggable_id']);
            $table->index(['taggable_type', 'taggable_id']);
        });

        Schema::create('asset_collections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'slug']);
        });

        Schema::create('asset_folders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->timestamps();

            $table->unique(['user_id', 'slug']);
        });

        Schema::create('assets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('asset_folder_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 32)->default('image');
            $table->string('kind', 32)->default('other');
            $table->string('name');
            $table->text('path')->nullable();
            $table->text('url')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'kind']);
            $table->index(['user_id', 'asset_folder_id']);
        });

        Schema::create('asset_collection_items', function (Blueprint $table): void {
            $table->foreignId('asset_collection_id')->constrained()->cascadeOnDelete();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['asset_collection_id', 'asset_id']);
            $table->index('asset_id');
        });

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

    public function down(): void
    {
        Schema::dropIfExists('asset_collection_targets');
        Schema::dropIfExists('asset_collection_items');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('asset_folders');
        Schema::dropIfExists('asset_collections');
        Schema::dropIfExists('taggables');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('entity_links');
        Schema::dropIfExists('events');
        Schema::dropIfExists('factions');
        Schema::dropIfExists('locations');
    }
};
