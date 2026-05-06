<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->jsonb('tags')->nullable();
            $table->jsonb('resources')->nullable();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->date('last_played')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });

        Schema::create('scenarios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['campaign_id', 'updated_at']);
        });

        Schema::create('maps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('scenario_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('width')->default(20);
            $table->unsignedInteger('height')->default(20);
            $table->unsignedInteger('cell_size')->default(32);
            $table->jsonb('data')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['campaign_id', 'updated_at']);
            $table->index(['scenario_id', 'updated_at']);
        });

        Schema::create('characters', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('scenario_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('role')->default('NPC');
            $table->string('race')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('level')->default(1);
            $table->jsonb('stats')->nullable();
            $table->jsonb('inventory')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['campaign_id', 'updated_at']);
            $table->index(['scenario_id', 'updated_at']);
        });

        Schema::create('items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 100)->default('Прочее');
            $table->string('rarity', 100)->default('Обычный');
            $table->text('description')->nullable();
            $table->jsonb('modifiers')->default('[]');
            $table->decimal('weight', 10, 2)->default(0);
            $table->unsignedInteger('value')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
        Schema::dropIfExists('characters');
        Schema::dropIfExists('maps');
        Schema::dropIfExists('scenarios');
        Schema::dropIfExists('campaigns');
    }
};
