<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'two_factor_enabled')) {
                    $table->boolean('two_factor_enabled')->default(false)->after('status');
                }

                if (!Schema::hasColumn('users', 'two_factor_enabled_at')) {
                    $table->timestamp('two_factor_enabled_at')->nullable()->after('two_factor_enabled');
                }
            });
        }

        if (!Schema::hasTable('two_factor_challenges')) {
            Schema::create('two_factor_challenges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('purpose', 32);
                $table->string('challenge_hash', 64)->unique();
                $table->string('code_hash', 64);
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->timestamp('expires_at');
                $table->timestamp('consumed_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'purpose']);
                $table->index('expires_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('two_factor_challenges');

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (Schema::hasColumn('users', 'two_factor_enabled_at')) {
                    $table->dropColumn('two_factor_enabled_at');
                }

                if (Schema::hasColumn('users', 'two_factor_enabled')) {
                    $table->dropColumn('two_factor_enabled');
                }
            });
        }
    }
};

