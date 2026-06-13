<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chronicles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('start_label')->nullable();
            $table->string('end_label')->nullable();
            $table->unsignedInteger('step_size')->default(10);
            $table->jsonb('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
            $table->index(['campaign_id', 'updated_at']);
        });

        Schema::table('events', function (Blueprint $table): void {
            $table->foreignId('chronicle_id')->nullable()->after('campaign_id')->constrained('chronicles')->nullOnDelete();
            $table->integer('position')->default(0)->after('ends_at');
            $table->integer('end_position')->nullable()->after('position');
            $table->string('start_label')->nullable()->after('end_position');
            $table->string('end_label')->nullable()->after('start_label');

            $table->index(['chronicle_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table): void {
            $table->dropIndex(['chronicle_id', 'position']);
            $table->dropConstrainedForeignId('chronicle_id');
            $table->dropColumn(['position', 'end_position', 'start_label', 'end_label']);
        });

        Schema::dropIfExists('chronicles');
    }
};
