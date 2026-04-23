<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('items')) {
            return;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE items ALTER COLUMN type SET DEFAULT 'Прочее'");
            DB::statement("ALTER TABLE items ALTER COLUMN rarity SET DEFAULT 'Обычный'");
        }

        DB::table('items')
            ->whereIn('type', [
                'РџСЂРѕС‡РµРµ',
                'Р СџРЎР‚Р С•РЎвЂЎР ВµР Вµ',
            ])
            ->update(['type' => 'Прочее']);

        DB::table('items')
            ->whereIn('rarity', [
                'РћР±С‹С‡РЅС‹Р№',
                'Р С›Р В±РЎвЂ№РЎвЂЎР Р…РЎвЂ№Р в„–',
            ])
            ->update(['rarity' => 'Обычный']);
    }

    public function down(): void
    {
        if (!Schema::hasTable('items')) {
            return;
        }

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE items ALTER COLUMN type SET DEFAULT 'РџСЂРѕС‡РµРµ'");
            DB::statement("ALTER TABLE items ALTER COLUMN rarity SET DEFAULT 'РћР±С‹С‡РЅС‹Р№'");
        }
    }
};

