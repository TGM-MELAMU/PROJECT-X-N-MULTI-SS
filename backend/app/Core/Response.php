<?php

declare(strict_types=1);

namespace MultiSS\Core;

class Response
{
    public static function json(
        array $data,
        int $statusCode = 200
    ): void {
        http_response_code(
            $statusCode
        );

        header(
            'Content-Type: application/json; charset=utf-8'
        );

        echo json_encode($data);
    }

    public static function text(
        string $data,
        int $statusCode = 200
    ): void {
        http_response_code(
            $statusCode
        );

        header(
            'Content-Type: text/plain; charset=utf-8'
        );

        echo $data;
    }
}