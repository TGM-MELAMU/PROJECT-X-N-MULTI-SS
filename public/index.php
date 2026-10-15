<?php

declare(strict_types=1);

require_once __DIR__ . '/../backend/bootstrap.php';

use MultiSS\Core\Request;
use MultiSS\Core\Router;
use MultiSS\Core\Session;
use MultiSS\Middleware\CorsMiddleware;
use MultiSS\Middleware\CsrfMiddleware;
use MultiSS\Middleware\RateLimitMiddleware;
use MultiSS\Middleware\SecurityHeadersMiddleware;

SecurityHeadersMiddleware::handle();

CorsMiddleware::handle();

Session::start();

$request = new Request();

RateLimitMiddleware::handle($request);

CsrfMiddleware::validate($request);

$router = new Router();

require_once __DIR__ . '/../backend/routes/api.php';

$router->dispatch($request);
