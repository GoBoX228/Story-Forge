<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('character_groups')) {
            Schema::create('character_groups', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('slug');
                $table->text('description')->nullable();
                $table->unsignedInteger('order_index')->default(0);
                $table->timestamps();

                $table->unique(['user_id', 'slug']);
                $table->index(['user_id', 'order_index']);
            });
        }

        if (Schema::hasTable('characters') && !Schema::hasColumn('characters', 'character_group_id')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->foreignId('character_group_id')
                    ->nullable()
                    ->after('scenario_id')
                    ->constrained()
                    ->nullOnDelete();
                $table->index(['character_group_id', 'updated_at']);
            });
        }

        if (!Schema::hasTable('item_groups')) {
            Schema::create('item_groups', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('slug');
                $table->text('description')->nullable();
                $table->unsignedInteger('order_index')->default(0);
                $table->timestamps();

                $table->unique(['user_id', 'slug']);
                $table->index(['user_id', 'order_index']);
            });
        }

        if (Schema::hasTable('items') && !Schema::hasColumn('items', 'item_group_id')) {
            Schema::table('items', function (Blueprint $table): void {
                $table->foreignId('item_group_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained()
                    ->nullOnDelete();
                $table->index(['item_group_id', 'updated_at']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('items') && Schema::hasColumn('items', 'item_group_id')) {
            Schema::table('items', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('item_group_id');
            });
        }

        if (Schema::hasTable('characters') && Schema::hasColumn('characters', 'character_group_id')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('character_group_id');
            });
        }

        Schema::dropIfExists('item_groups');
        Schema::dropIfExists('character_groups');
    }
};
