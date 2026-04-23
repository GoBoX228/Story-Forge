<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reports')) {
            Schema::create('reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('target_type', 32);
                $table->unsignedBigInteger('target_id');
                $table->string('reason', 64);
                $table->text('description')->nullable();
                $table->string('status', 32)->default('open');
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();

                $table->index(['target_type', 'target_id']);
                $table->index(['status', 'created_at']);
            });
        }

        if (!Schema::hasTable('announcements')) {
            Schema::create('announcements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('type', 32)->default('info');
                $table->text('message');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('admin_audit_logs')) {
            Schema::create('admin_audit_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('action', 128);
                $table->text('details')->nullable();
                $table->jsonb('context')->nullable();
                $table->timestamps();

                $table->index(['action', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_logs');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('reports');
    }
};

