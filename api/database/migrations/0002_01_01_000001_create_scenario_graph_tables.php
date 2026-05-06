<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scenario_nodes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('scenario_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->string('title')->nullable();
            $table->text('content')->nullable();
            $table->jsonb('position')->nullable();
            $table->jsonb('config')->nullable();
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->index(['scenario_id', 'order_index']);
            $table->index(['scenario_id', 'type']);
        });

        Schema::create('scenario_transitions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('scenario_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_node_id')->constrained('scenario_nodes')->cascadeOnDelete();
            $table->foreignId('to_node_id')->constrained('scenario_nodes')->cascadeOnDelete();
            $table->string('type', 32)->default('linear');
            $table->string('label')->nullable();
            $table->jsonb('condition')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->index(['scenario_id', 'order_index']);
            $table->index(['from_node_id', 'order_index']);
            $table->index('to_node_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scenario_transitions');
        Schema::dropIfExists('scenario_nodes');
    }
};
