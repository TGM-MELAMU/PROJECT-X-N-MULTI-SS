<?php

declare(strict_types=1);

namespace MultiSS\Integrations;

/** Retry decisions only; the application does not transmit anything here. */
final class RetryPolicy
{
    public static function shouldRetry(
        string $method,
        int $status,
        int $attemptNumber,
        ?string $idempotencyKey = null
    ): bool {
        if ($attemptNumber < 1 || $attemptNumber >= 3) {
            return false;
        }
        $method = strtoupper(trim($method));
        $safe = in_array($method, ['GET', 'HEAD'], true)
            || (in_array($method, ['POST', 'PUT', 'PATCH'], true)
                && $idempotencyKey !== null && trim($idempotencyKey) !== '');
        return $safe && in_array($status, [408, 425, 429, 500, 502, 503, 504], true);
    }
}
