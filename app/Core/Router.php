<?php

declare(strict_types=1);

namespace MultiSS\Core;

class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): void
{
    $this->addRoute('GET', $path, $handler);
}

public function post(string $path, callable $handler): void
{
    $this->addRoute('POST', $path, $handler);
}

public function put(string $path, callable $handler): void
{
    $this->addRoute('PUT', $path, $handler);
}

public function patch(string $path, callable $handler): void
{
    $this->addRoute('PATCH', $path, $handler);
}

public function delete(string $path, callable $handler): void
{
    $this->addRoute('DELETE', $path, $handler);
}

private function addRoute(
    string $method,
    string $path,
    callable $handler
): void {
    $this->routes[] = [
        'method' => $method,
        'path' => $path,
        'handler' => $handler
    ];
}

    public function dispatch(Request $request): void
{
    $pathExists = false;

    foreach ($this->routes as $route) {
        if ($route['path'] === $request->path()) {
            $pathExists = true;

            if ($route['method'] === $request->method()) {
                $route['handler']($request);
                return;
            }
        }
    }

    if ($pathExists) {
        Response::json([
            'success' => false,
            'message' => 'Method not allowed'
        ], 405);

        return;
    }

    Response::json([
        'success' => false,
        'message' => 'Route not found'
    ], 404);
}
}