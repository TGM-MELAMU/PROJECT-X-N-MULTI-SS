<?php

declare(strict_types=1);

namespace MultiSS\Middleware;

final class SecurityHeadersMiddleware
{
    public static function handle(): void
    {
        header_remove('X-Powered-By');

        header('X-Content-Type-Options: nosniff');

        header('X-Frame-Options: DENY');

        header('Referrer-Policy: no-referrer');

        header(
            "Content-Security-Policy: default-src 'none'; frame-ancestors 'none'"
        );
    }

    private function __construct()
    {
    }
}