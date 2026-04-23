<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('characters')) {
            return;
        }

        Schema::create('characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scenario_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('role')->default('NPC');
            $table->string('race')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('level')->default(1);
            $table->jsonb('stats')->nullable();
            $table->jsonb('inventory')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('characters');
    }
};
