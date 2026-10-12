<?php

declare(strict_types=1);

use MultiSS\Core\Config;

return [
    'name' => Config::get('APP_NAME', 'MultiSS'),
    'environment' => Config::get('APP_ENV', 'production'),
    'debug' => Config::bool('APP_DEBUG', false),
];