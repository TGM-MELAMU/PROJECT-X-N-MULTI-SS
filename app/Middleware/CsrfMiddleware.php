<?php

declare(strict_types=1);

namespace MultiSS\Middleware;

use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Core\Session;

final class CsrfMiddleware
{
    private const SESSION_KEY = 'csrf_token';

    public static function token(): string
    {
        $token = Session::get(self::SESSION_KEY);

        if (!is_string($token) || $token === '') {
            $token = bin2hex(random_bytes(32));

            Session::set(self::SESSION_KEY, $token);
        }

        return $token;
    }

    public static function validate(Request $request): void
    {
        if (
            in_array(
                $request->method(),
                ['GET', 'HEAD', 'OPTIONS'],
                true
            )
        ) {
            return;
        }

        $sessionToken = Session::get(self::SESSION_KEY);

        $requestToken = $request->header('X-CSRF-Token');

        if (
            !is_string($sessionToken) ||
            !is_string($requestToken) ||
            !hash_equals($sessionToken, $requestToken)
        ) {
            Response::json([
                'success' => false,
                'message' => 'Invalid CSRF token',
            ], 403);

            exit;
        }
    }

    private function __construct()
    {
    }
}