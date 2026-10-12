<?php

declare(strict_types=1);

use MultiSS\Core\Config;

return [
    'host' => Config::get('DB_HOST', '127.0.0.1'),
    'port' => Config::int('DB_PORT', 3306),
    'database' => Config::get('DB_DATABASE'),
    'username' => Config::get('DB_USERNAME'),
    'password' => Config::get('DB_PASSWORD', ''),
    'charset' => 'utf8mb4',
];