<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role', 32)->default(User::ROLE_USER)->index();
            }

            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status', 32)->default(User::STATUS_ACTIVE)->index();
            }
        });

        DB::table('users')->whereNull('role')->update(['role' => User::ROLE_USER]);
        DB::table('users')->whereNull('status')->update(['status' => User::STATUS_ACTIVE]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'role')) {
                $table->dropColumn('role');
            }

            if (Schema::hasColumn('users', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};

