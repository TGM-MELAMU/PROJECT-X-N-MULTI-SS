<?php

declare(strict_types=1);

use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Core\Router;
use MultiSS\Middleware\CsrfMiddleware;
use MultiSS\Core\Database;
use MultiSS\Core\Logger;

/** @var Router $router */

$router->get('/api/v1/health', function (Request $request): void {
    try {
        $pdo = Database::connection();

        $pdo->query('SELECT 1');

        Response::json([
            'success' => true,
            'status' => 'healthy',
            'database' => 'connected',
        ]);
    } catch (Throwable $exception) {
        Logger::error('Database health check failed', [
            'type' => $exception::class,
            'message' => $exception->getMessage(),
        ]);

        Response::json([
            'success' => false,
            'status' => 'unhealthy',
            'database' => 'disconnected',
        ], 503);
    }
});

$router->get('/api/v1/csrf-token', function (Request $request): void {
    Response::json([
        'success' => true,
        'csrf_token' => CsrfMiddleware::token(),
    ]);
});

