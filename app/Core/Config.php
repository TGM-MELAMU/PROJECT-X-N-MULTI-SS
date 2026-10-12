<?php

declare(strict_types=1);

namespace MultiSS\Core;

final class Config
{
    public static function get(
        string $key,
        ?string $default = null
    ): ?string {
        $value = $_ENV[$key] ?? $default;

        return is_string($value) ? $value : $default;
    }

    public static function int(
        string $key,
        int $default = 0
    ): int {
        $value = self::get($key);

        if ($value === null) {
            return $default;
        }

        return filter_var(
            $value,
            FILTER_VALIDATE_INT
        ) !== false
            ? (int) $value
            : $default;
    }

    public static function bool(
        string $key,
        bool $default = false
    ): bool {
        $value = self::get($key);

        if ($value === null) {
            return $default;
        }

        $result = filter_var(
            $value,
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE
        );

        return $result ?? $default;
    }
}