<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addCampaignId('scenarios');
        $this->addCampaignId('maps');
        $this->addCampaignId('characters');
    }

    public function down(): void
    {
    }

    private function addCampaignId(string $tableName): void
    {
        if (!Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'campaign_id')) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) {
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
        });
    }
};

