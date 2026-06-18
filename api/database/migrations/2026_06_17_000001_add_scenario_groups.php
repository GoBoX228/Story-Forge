<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scenario_groups', function (Blueprint $table): void {
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

        Schema::table('scenarios', function (Blueprint $table): void {
            $table->foreignId('scenario_group_id')
                ->nullable()
                ->after('campaign_id')
                ->constrained('scenario_groups')
                ->nullOnDelete();

            $table->index(['scenario_group_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::table('scenarios', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('scenario_group_id');
        });

        Schema::dropIfExists('scenario_groups');
    }
};

