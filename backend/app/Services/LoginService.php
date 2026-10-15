<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Repositories\UserRepository;

final class LoginService
{
    private UserRepository $users;

    public function __construct(
        ?UserRepository $users = null
    ) {
        $this->users =
            $users ?? new UserRepository();
    }

    public function authenticate(array $data): array
    {
        $email = isset($data['email'])
            ? strtolower(trim((string) $data['email']))
            : '';

        $password = isset($data['password'])
            && is_string($data['password'])
                ? $data['password']
                : '';

        $errors = [];

        if (
            $email === ''
            || !filter_var(
                $email,
                FILTER_VALIDATE_EMAIL
            )
        ) {
            $errors['email'] =
                'A valid email address is required.';
        }

        if ($password === '') {
            $errors['password'] =
                'Password is required.';
        }

        if ($errors !== []) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed.',
                'errors' => $errors,
            ];
        }

        $user = $this->users->findByEmail(
            $email
        );

        if (
            $user === null
            || !password_verify(
                $password,
                $user['password_hash']
            )
        ) {
            return [
                'success' => false,
                'status' => 401,
                'message' =>
                    'Invalid email or password.',
            ];
        }

        if ($user['status'] !== 'active') {
            return [
                'success' => false,
                'status' => 403,
                'message' =>
                    'This account is inactive.',
            ];
        }

        return [
            'success' => true,
            'user' => [
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
            ],
        ];
    }
}