<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasColumn('users', 'role')) {
            return;
        }

        $hasAdmin = DB::table('users')->where('role', User::ROLE_ADMIN)->exists();
        if ($hasAdmin) {
            return;
        }

        $firstUser = DB::table('users')->orderBy('id')->first();
        if (!$firstUser) {
            return;
        }

        DB::table('users')
            ->where('id', $firstUser->id)
            ->update([
                'role' => User::ROLE_ADMIN,
                'status' => User::STATUS_ACTIVE,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
    }
};

