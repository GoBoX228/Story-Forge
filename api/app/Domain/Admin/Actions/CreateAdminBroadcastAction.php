<?php

namespace App\Domain\Admin\Actions;

use App\Domain\Admin\DTO\CreateBroadcastData;
use App\Models\Announcement;
use App\Models\User;

class CreateAdminBroadcastAction
{
    public function execute(User $admin, CreateBroadcastData $data): Announcement
    {
        return Announcement::query()->create([
            'user_id' => $admin->id,
            'type' => $data->type,
            'message' => $data->message,
        ]);
    }
}
