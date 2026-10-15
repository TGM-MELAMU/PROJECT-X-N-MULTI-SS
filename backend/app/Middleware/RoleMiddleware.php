<?php

declare(strict_types=1);

namespace MultiSS\Middleware;

use MultiSS\Core\Response;
use MultiSS\Repositories\RoleRepository;

final class RoleMiddleware
{
    public static function handle(
        string|array $requiredRoles
    ): ?array {
        $user = AuthMiddleware::handle();

        if ($user === null) {
            return null;
        }

        $roles = is_array($requiredRoles)
            ? $requiredRoles
            : [$requiredRoles];

        $roleRepository = new RoleRepository();

        foreach ($roles as $role) {
            $role = strtolower(trim((string) $role));

            if ($role === '') {
                continue;
            }

            if (
                $roleRepository->userHasRole(
                    (int) $user['user_id'],
                    $role
                )
            ) {
                return $user;
            }
        }

        Response::json([
            'success' => false,
            'message' => 'You do not have permission to access this resource.',
        ], 403);

        return null;
    }

    private function __construct()
    {
    }
}