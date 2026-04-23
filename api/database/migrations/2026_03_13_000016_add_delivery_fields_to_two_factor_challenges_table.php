<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('two_factor_challenges')) {
            return;
        }

        Schema::table('two_factor_challenges', function (Blueprint $table) {
            if (!Schema::hasColumn('two_factor_challenges', 'last_sent_at')) {
                $table->timestamp('last_sent_at')->nullable()->after('consumed_at');
            }

            if (!Schema::hasColumn('two_factor_challenges', 'sent_count')) {
                $table->unsignedTinyInteger('sent_count')->default(1)->after('last_sent_at');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('two_factor_challenges')) {
            return;
        }

        Schema::table('two_factor_challenges', function (Blueprint $table) {
            if (Schema::hasColumn('two_factor_challenges', 'sent_count')) {
                $table->dropColumn('sent_count');
            }

            if (Schema::hasColumn('two_factor_challenges', 'last_sent_at')) {
                $table->dropColumn('last_sent_at');
            }
        });
    }
};

