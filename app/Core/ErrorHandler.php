<?php

declare(strict_types=1);

namespace MultiSS\Core;

use ErrorException;
use Throwable;

final class ErrorHandler
{
    public static function register(): void
    {
        error_reporting(E_ALL);

        ini_set('display_errors', '0');

        set_error_handler(
            function (
                int $severity,
                string $message,
                string $file,
                int $line
            ): bool {
                if (!(error_reporting() & $severity)) {
                    return false;
                }

                throw new ErrorException(
                    $message,
                    0,
                    $severity,
                    $file,
                    $line
                );
            }
        );

        set_exception_handler(
            function (Throwable $exception): void {
                Logger::error('Unhandled exception', [
                    'type' => $exception::class,
                    'message' => $exception->getMessage(),
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                ]);

                Response::json([
                    'success' => false,
                    'message' => 'Internal server error',
                ], 500);
            }
        );
    }

    private function __construct()
    {
    }
}