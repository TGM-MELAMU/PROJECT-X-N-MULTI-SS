<?php

declare(strict_types=1);

namespace MultiSS\Middleware;

use MultiSS\Core\Config;
use MultiSS\Core\Logger;
use MultiSS\Core\Request;
use MultiSS\Core\Response;

final class RateLimitMiddleware
{
    public static function handle(
        Request $request,
        ?int $maxRequests = null,
        ?int $windowSeconds = null
    ): void {
        if ($request->method() === 'OPTIONS') {
            return;
        }

        $maxRequests ??= Config::int(
            'RATE_LIMIT_MAX_REQUESTS',
            120
        );

        $windowSeconds ??= Config::int(
            'RATE_LIMIT_WINDOW_SECONDS',
            60
        );

        $maxRequests = max(1, $maxRequests);
        $windowSeconds = max(1, $windowSeconds);

        $directory = dirname(__DIR__, 2)
            . '/storage/rate-limits';

        if (
            !is_dir($directory) &&
            !mkdir($directory, 0775, true) &&
            !is_dir($directory)
        ) {
            Logger::warning(
                'Could not create rate-limit storage directory'
            );

            return;
        }

        $key = self::clientKey($request);

        $file = $directory
            . '/'
            . hash('sha256', $key)
            . '.json';

        $handle = fopen($file, 'c+');

        if ($handle === false) {
            Logger::warning(
                'Could not open rate-limit storage file'
            );

            return;
        }

        $now = time();
        $count = 0;
        $windowStart = $now;

        try {
            if (!flock($handle, LOCK_EX)) {
                Logger::warning(
                    'Could not lock rate-limit storage file'
                );

                return;
            }

            $contents = stream_get_contents($handle);

            if (is_string($contents) && $contents !== '') {
                $stored = json_decode($contents, true);

                if (is_array($stored)) {
                    $count = (int) ($stored['count'] ?? 0);
                    $windowStart = (int) (
                        $stored['window_start'] ?? $now
                    );
                }
            }

            if (($now - $windowStart) >= $windowSeconds) {
                $count = 0;
                $windowStart = $now;
            }

            $count++;

            rewind($handle);
            ftruncate($handle, 0);

            fwrite(
                $handle,
                json_encode([
                    'count' => $count,
                    'window_start' => $windowStart,
                ])
            );

            fflush($handle);
            flock($handle, LOCK_UN);
        } finally {
            fclose($handle);
        }

        $resetAt = $windowStart + $windowSeconds;

        header(
            'X-RateLimit-Limit: ' . $maxRequests
        );

        header(
            'X-RateLimit-Remaining: '
            . max(0, $maxRequests - $count)
        );

        header(
            'X-RateLimit-Reset: ' . $resetAt
        );

        if ($count > $maxRequests) {
            header(
                'Retry-After: '
                . max(1, $resetAt - $now)
            );

            Response::json([
                'success' => false,
                'message' => 'Too many requests',
            ], 429);

            exit;
        }
    }

    private static function clientKey(Request $request): string
    {
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        return implode('|', [
            $ipAddress,
            $request->method(),
            $request->path(),
        ]);
    }

    private function __construct()
    {
    }
}