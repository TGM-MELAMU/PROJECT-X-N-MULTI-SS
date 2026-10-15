<?php

declare(strict_types=1);

use MultiSS\Core\Config;

return [
    'host' => Config::get('MAIL_HOST', ''),
    'port' => Config::int('MAIL_PORT', 587),

    'username' => Config::get('MAIL_USERNAME', ''),
    'password' => Config::get('MAIL_PASSWORD', ''),

    'encryption' => Config::get(
        'MAIL_ENCRYPTION',
        'tls'
    ),

    'from_address' => Config::get(
        'MAIL_FROM_ADDRESS',
        ''
    ),

    'from_name' => Config::get(
        'MAIL_FROM_NAME',
        'MultiSS'
    ),

    'frontend_url' => Config::get(
        'FRONTEND_URL',
        'http://localhost:5173'
    ),

    'email_verification_expiry_minutes' =>
        Config::int(
            'EMAIL_VERIFICATION_EXPIRY_MINUTES',
            1440
        ),

    'password_reset_expiry_minutes' =>
        Config::int(
            'PASSWORD_RESET_EXPIRY_MINUTES',
            60
        ),
];