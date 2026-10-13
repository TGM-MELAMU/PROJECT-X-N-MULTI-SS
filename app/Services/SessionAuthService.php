<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Core\Session;
use MultiSS\Repositories\UserRepository;

final class SessionAuthService
{
    private UserRepository $users;

    public function __construct(
        ?UserRepository $users = null
    ) {
        $this->users =
            $users ?? new UserRepository();
    }

    public function currentUser(): ?array
    {
        $userId = Session::get(
            'auth_user_id'
        );

        if (
            !is_int($userId)
            && !ctype_digit((string) $userId)
        ) {
            return null;
        }

        $user = $this->users->findById(
            (int) $userId
        );

        if ($user === null) {
            Session::remove(
                'auth_user_id'
            );

            return null;
        }

        if ($user['status'] !== 'active') {
            Session::remove(
                'auth_user_id'
            );

            return null;
        }

        return [
            'user_id' =>
                (int) $user['user_id'],

            'first_name' =>
                $user['first_name'],

            'last_name' =>
                $user['last_name'],

            'email' =>
                $user['email'],

            'email_verified' =>
                $user['email_verified_at'] !== null,
        ];
    }

    public function userId(): ?int
    {
        $user = $this->currentUser();

        if ($user === null) {
            return null;
        }

        return (int) $user['user_id'];
    }

    public function authenticated(): bool
    {
        return $this->currentUser() !== null;
    }
}