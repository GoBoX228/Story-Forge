<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('characters', 'level')) {
            return;
        }

        Schema::table('characters', function (Blueprint $table): void {
            $table->dropColumn('level');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('characters', 'level')) {
            return;
        }

        Schema::table('characters', function (Blueprint $table): void {
            $table->unsignedInteger('level')->default(1)->after('description');
        });
    }
};
