<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('maps')) {
            return;
        }

        Schema::create('maps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scenario_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedInteger('width')->default(20);
            $table->unsignedInteger('height')->default(20);
            $table->unsignedInteger('cell_size')->default(32);
            $table->jsonb('data')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maps');
    }
};
