<?php

declare(strict_types=1);

namespace MultiSS\Middleware;

use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Core\Session;

final class CsrfMiddleware
{
    private const SESSION_KEY =
        'csrf_token';

    /*
     * Server-to-server webhook endpoints do not
     * use the customer's cookie session and
     * therefore must not require browser CSRF.
     *
     * Keep this list exact and minimal.
     */
    private const EXEMPT_PATHS = [
        '/api/v1/payments/payfast/notify',
        '/api/v1/payments/webhook',
    ];

    public static function token(): string
    {
        $token =
            Session::get(
                self::SESSION_KEY
            );

        if (
            !is_string($token)
            || $token === ''
        ) {
            $token =
                bin2hex(
                    random_bytes(32)
                );

            Session::set(
                self::SESSION_KEY,
                $token
            );
        }

        return $token;
    }

    public static function validate(
        Request $request
    ): void {
        /*
         * Read-only requests do not require CSRF.
         */
        if (
            in_array(
                $request->method(),
                [
                    'GET',
                    'HEAD',
                    'OPTIONS',
                ],
                true
            )
        ) {
            return;
        }

        /*
         * PayFast ITN is server-to-server.
         *
         * It is protected separately by:
         * - PayFast signature verification
         * - merchant verification
         * - source verification
         * - amount verification
         * - PayFast server confirmation
         *
         * Only POST requests to an explicitly
         * whitelisted webhook path bypass CSRF.
         */
        if (
            $request->method() === 'POST'
            && in_array(
                $request->path(),
                self::EXEMPT_PATHS,
                true
            )
        ) {
            return;
        }

        $sessionToken =
            Session::get(
                self::SESSION_KEY
            );

        $requestToken =
            $request->header(
                'X-CSRF-Token'
            );

        if (
            !is_string($sessionToken)
            || !is_string($requestToken)
            || !hash_equals(
                $sessionToken,
                $requestToken
            )
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    'Invalid CSRF token',
            ], 403);

            exit;
        }
    }

    private function __construct()
    {
    }
}
