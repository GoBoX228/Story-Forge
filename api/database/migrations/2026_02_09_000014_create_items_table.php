<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('items')) {
            return;
        }

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 100)->default('Прочее');
            $table->string('rarity', 100)->default('Обычный');
            $table->text('description')->nullable();
            $table->jsonb('modifiers')->nullable();
            $table->decimal('weight', 10, 2)->default(0);
            $table->unsignedInteger('value')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
