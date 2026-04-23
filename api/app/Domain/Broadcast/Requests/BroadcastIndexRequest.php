<?php

namespace App\Domain\Broadcast\Requests;

use App\Domain\Broadcast\DTO\BroadcastIndexData;
use Illuminate\Foundation\Http\FormRequest;

class BroadcastIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [];
    }

    public function toDto(): BroadcastIndexData
    {
        return new BroadcastIndexData();
    }
}

