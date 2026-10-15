<?php

declare(strict_types=1);

$env = static function (
    string $key,
    ?string $default = null
): ?string {
    if (array_key_exists($key, $_ENV)) {
        return (string) $_ENV[$key];
    }

    if (array_key_exists($key, $_SERVER)) {
        return (string) $_SERVER[$key];
    }

    $value = getenv($key);

    if ($value !== false) {
        return (string) $value;
    }

    return $default;
};

return [
    /*
     * "demo" is for local/school testing only.
     * Replace this provider when a real distance/
     * geocoding provider is selected.
     */
    'distance_provider' =>
        strtolower(
            trim(
                (string) $env(
                    'DISTANCE_PROVIDER',
                    'demo'
                )
            )
        ),

    /*
     * Server-controlled deterministic test value.
     * Customers cannot submit this value.
     */
    'demo_distance_km' =>
        (float) $env(
            'DEMO_DISTANCE_KM',
            '12'
        ),
];