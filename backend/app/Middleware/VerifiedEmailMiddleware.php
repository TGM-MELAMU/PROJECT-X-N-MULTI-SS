<?php

declare(strict_types=1);

namespace MultiSS\Middleware;

use MultiSS\Core\Response;

final class VerifiedEmailMiddleware
{
    public static function handle(): ?array
    {
        $user = AuthMiddleware::handle();

        if ($user === null) {
            return null;
        }

        if (!$user['email_verified']) {
            Response::json([
                'success' => false,
                'message' => 'Email verification required.',
            ], 403);

            return null;
        }

        return $user;
    }

    private function __construct()
    {
    }
}