<?php

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use MultiSS\Core\ErrorHandler;

ErrorHandler::register();

$dotenv = Dotenv::createImmutable(__DIR__);

$dotenv->load();
