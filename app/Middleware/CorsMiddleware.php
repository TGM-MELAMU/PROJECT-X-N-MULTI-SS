<?php

declare(strict_types=1);

namespace MultiSS\Middleware;

use MultiSS\Core\Config;

final class CorsMiddleware
{
    public static function handle(): void
    {
        $allowedOrigin = Config::get('CORS_ALLOWED_ORIGIN');

        $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? null;

        if (
            is_string($allowedOrigin) &&
            is_string($requestOrigin) &&
            hash_equals($allowedOrigin, $requestOrigin)
        ) {
            header('Access-Control-Allow-Origin: ' . $requestOrigin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        }

        header(
            'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS'
        );

        header(
            'Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token'
        );

        header('Access-Control-Max-Age: 600');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    private function __construct()
    {
    }
}