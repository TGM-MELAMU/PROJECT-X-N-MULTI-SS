<?php

declare(strict_types=1);

namespace MultiSS\Core;

final class Logger
{
    public static function info(string $message, array $context = []): void
    {
        self::write('INFO', $message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::write('WARNING', $message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::write('ERROR', $message, $context);
    }

    private static function write(
        string $level,
        string $message,
        array $context = []
    ): void {
        $logDirectory = dirname(__DIR__, 2) . '/storage/logs';

        if (!is_dir($logDirectory)) {
            mkdir($logDirectory, 0775, true);
        }

        $logFile = $logDirectory . '/app.log';

        $contextText = '';

        if ($context !== []) {
            $contextText = ' ' . json_encode(
                $context,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );
        }

        $line = sprintf(
            "[%s] %s: %s%s%s",
            date('Y-m-d H:i:s'),
            $level,
            $message,
            $contextText,
            PHP_EOL
        );

        file_put_contents(
            $logFile,
            $line,
            FILE_APPEND | LOCK_EX
        );
    }

    private function __construct()
    {
    }
}