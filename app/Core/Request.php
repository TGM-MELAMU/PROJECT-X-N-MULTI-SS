<?php

declare(strict_types=1);

namespace MultiSS\Core;

class Request
{
    private string $method;
    private string $path;
    private array $query;
    private array $body;
    private array $headers;

    public function __construct()
    {
        $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        $this->path = $this->detectPath();

        $this->query = $_GET;

        $this->body = $this->readJsonBody();

        $this->headers = $this->detectHeaders();
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function query(): array
    {
        return $this->query;
    }

    public function body(): array
    {
        return $this->body;
    }

    public function headers(): array
    {
        return $this->headers;
    }

    public function header(string $name): ?string
    {
        foreach ($this->headers as $headerName => $value) {
            if (strcasecmp($headerName, $name) === 0) {
                return $value;
            }
        }

        return null;
    }

    private function detectPath(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';

        $path = parse_url($uri, PHP_URL_PATH);

        if (!is_string($path)) {
            return '/';
        }

        $basePath = dirname($_SERVER['SCRIPT_NAME'] ?? '');

        if (
            $basePath !== '/' &&
            $basePath !== '.' &&
            str_starts_with($path, $basePath)
        ) {
            $path = substr($path, strlen($basePath));
        }

        return '/' . ltrim($path, '/');
    }

    private function readJsonBody(): array
    {
        $rawBody = file_get_contents('php://input');

        if ($rawBody === false || trim($rawBody) === '') {
            return [];
        }

        $decoded = json_decode($rawBody, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function detectHeaders(): array
    {
        if (function_exists('getallheaders')) {
            return getallheaders();
        }

        return [];
    }
}