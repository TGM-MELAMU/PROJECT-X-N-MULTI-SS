<?php

declare(strict_types=1);

$env = static function (
    string $key,
    ?string $default = null
): ?string {
    if (
        array_key_exists(
            $key,
            $_ENV
        )
    ) {
        return
            (string) $_ENV[$key];
    }

    if (
        array_key_exists(
            $key,
            $_SERVER
        )
    ) {
        return
            (string) $_SERVER[$key];
    }

    $value = getenv($key);

    if ($value !== false) {
        return (string) $value;
    }

    return $default;
};

$sandbox =
    filter_var(
        $env(
            'PAYFAST_SANDBOX',
            'true'
        ),
        FILTER_VALIDATE_BOOLEAN
    );

return [
    'merchant_id' =>
        trim(
            (string) $env(
                'PAYFAST_MERCHANT_ID',
                ''
            )
        ),

    'merchant_key' =>
        trim(
            (string) $env(
                'PAYFAST_MERCHANT_KEY',
                ''
            )
        ),

    'passphrase' =>
        trim(
            (string) $env(
                'PAYFAST_PASSPHRASE',
                ''
            )
        ),

    'sandbox' =>
        $sandbox,

    'process_url' =>
        $sandbox
            ? 'https://sandbox.payfast.co.za/eng/process'
            : 'https://www.payfast.co.za/eng/process',

    'validate_url' =>
        $sandbox
            ? 'https://sandbox.payfast.co.za/eng/query/validate'
            : 'https://www.payfast.co.za/eng/query/validate',

    'return_url' =>
        trim(
            (string) $env(
                'PAYFAST_RETURN_URL',
                ''
            )
        ),

    'cancel_url' =>
        trim(
            (string) $env(
                'PAYFAST_CANCEL_URL',
                ''
            )
        ),

    'notify_url' =>
        trim(
            (string) $env(
                'PAYFAST_NOTIFY_URL',
                ''
            )
        ),
];
