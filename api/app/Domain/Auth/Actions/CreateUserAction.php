<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\DTO\RegisterData;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CreateUserAction
{
    public function execute(RegisterData $data): User
    {
        $isFirstUser = User::query()->count() === 0;

        return User::query()->create([
            'name' => $data->name,
            'email' => $data->email,
            'password' => Hash::make($data->password),
            'role' => $isFirstUser ? User::ROLE_ADMIN : User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);
    }
}
