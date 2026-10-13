<?php

declare(strict_types=1);

use MultiSS\Controllers\AuthController;
use MultiSS\Core\Database;
use MultiSS\Core\Logger;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Core\Router;
use MultiSS\Middleware\CsrfMiddleware;
use MultiSS\Middleware\VerifiedEmailMiddleware;

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

$router->post(
    '/api/v1/auth/verify-email',
    function (Request $request): void {
        $controller = new AuthController();

        $controller->verifyEmail($request);
    }
);

$router->post(
    '/api/v1/auth/resend-verification',
    function (Request $request): void {
        $controller = new AuthController();

        $controller->resendVerification($request);
    }
);

$router->post(
    '/api/v1/auth/login',
    function (Request $request): void {
        $controller = new AuthController();

        $controller->login($request);
    }
);

$router->get(
    '/api/v1/auth/me',
    function (Request $request): void {
        $controller = new AuthController();

        $controller->me($request);
    }
);

$router->post(
    '/api/v1/auth/logout',
    function (Request $request): void {
        $controller = new AuthController();

        $controller->logout($request);
    }
);

$router->post(
    '/api/v1/auth/forgot-password',
    function (Request $request): void {
        $controller = new AuthController();

        $controller->forgotPassword($request);
    }
);

$router->post(
    '/api/v1/auth/reset-password',
    function (Request $request): void {
        $controller = new AuthController();

        $controller->resetPassword($request);
    }
);

$router->post(
    '/api/v1/auth/register',
    function (Request $request): void {
        $controller = new AuthController();

        $controller->register($request);
    }
);
