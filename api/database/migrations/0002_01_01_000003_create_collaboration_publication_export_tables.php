<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 32)->default('editor');
            $table->timestamps();

            $table->unique(['campaign_id', 'user_id']);
            $table->index(['user_id', 'role']);
        });

        Schema::create('comments', function (Blueprint $table): void {
            $table->id();
            $table->string('commentable_type', 64);
            $table->unsignedBigInteger('commentable_id');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['commentable_type', 'commentable_id']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('published_contents', function (Blueprint $table): void {
            $table->id();
            $table->string('content_type', 64);
            $table->unsignedBigInteger('content_id');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 32)->default('draft');
            $table->string('visibility', 32)->default('private');
            $table->string('slug')->nullable()->unique();
            $table->jsonb('metadata')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['content_type', 'content_id']);
            $table->index(['status', 'visibility']);
        });

        Schema::create('export_jobs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('target_type', 64);
            $table->unsignedBigInteger('target_id');
            $table->string('type', 32);
            $table->string('status', 32)->default('queued');
            $table->jsonb('options')->nullable();
            $table->text('file_path')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['target_type', 'target_id']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('idempotency_keys', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('key', 128);
            $table->string('method', 10);
            $table->string('route');
            $table->string('request_hash', 64);
            $table->string('status', 32)->default('processing');
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->jsonb('response_body')->nullable();
            $table->timestamp('locked_until')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->unique(['user_id', 'key']);
            $table->index('expires_at');
            $table->index(['status', 'locked_until']);
        });

        Schema::create('notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 64);
            $table->string('title');
            $table->text('body')->nullable();
            $table->jsonb('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('idempotency_keys');
        Schema::dropIfExists('export_jobs');
        Schema::dropIfExists('published_contents');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('campaign_members');
    }
};
