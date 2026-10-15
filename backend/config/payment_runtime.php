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

    return $value === false
        ? $default
        : (string) $value;
};

$gateway =
    strtolower(
        trim(
            (string) $env(
                'PAYMENT_GATEWAY',
                'demo'
            )
        )
    );

$gatewayName = match ($gateway) {
    'demo' => 'Demo',
    'payfast' => 'PayFast',
    default => 'Demo',
};

return [
    'gateway' =>
        $gatewayName,

    'payment_method' =>
        strtolower($gatewayName),

    'app_env' =>
        strtolower(
            trim(
                (string) $env(
                    'APP_ENV',
                    'development'
                )
            )
        ),

    'demo_enabled' =>
        filter_var(
            $env(
                'DEMO_PAYMENT_ENABLED',
                'true'
            ),
            FILTER_VALIDATE_BOOLEAN
        ),

    /*
     * Local/demo default only.
     *
     * Production deployments must configure
     * DEMO_PAYMENT_WEBHOOK_SECRET explicitly.
     */
    'demo_webhook_secret' =>
        trim(
            (string) $env(
                'DEMO_PAYMENT_WEBHOOK_SECRET',
                'multiss-local-demo-webhook-only'
            )
        ),
];