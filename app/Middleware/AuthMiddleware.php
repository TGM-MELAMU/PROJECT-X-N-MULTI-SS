<?php

declare(strict_types=1);

namespace MultiSS\Middleware;

use MultiSS\Core\Response;
use MultiSS\Services\SessionAuthService;

final class AuthMiddleware
{
    public static function handle(): ?array
    {
        $authService = new SessionAuthService();

        $user = $authService->currentUser();

        if ($user === null) {
            Response::json([
                'success' => false,
                'message' => 'Authentication required.',
            ], 401);

            return null;
        }

        return $user;
    }

    private function __construct()
    {
    }
}