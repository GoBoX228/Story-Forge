<?php

namespace App\Domain\Admin\Requests;

use App\Domain\Admin\DTO\CreateBroadcastData;
use Illuminate\Foundation\Http\FormRequest;

class AdminBroadcastsCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:info,warning,critical'],
            'message' => ['required', 'string', 'max:2000'],
        ];
    }

    public function toDto(): CreateBroadcastData
    {
        return new CreateBroadcastData(
            strtolower((string) $this->input('type')),
            (string) $this->input('message')
        );
    }
}
