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
            'handler' => $handler,
        ];
    }

    public function dispatch(Request $request): void
    {
        $pathExists = false;

        foreach ($this->routes as $route) {
            $params = $this->matchPath(
                $route['path'],
                $request->path()
            );

            if ($params !== null) {
                $pathExists = true;

                if ($route['method'] === $request->method()) {
                    if ($params === []) {
                        $route['handler']($request);
                    } else {
                        $route['handler']($request, $params);
                    }

                    return;
                }
            }
        }

        if ($pathExists) {
            Response::json([
                'success' => false,
                'message' => 'Method not allowed',
            ], 405);

            return;
        }

        Response::json([
            'success' => false,
            'message' => 'Route not found',
        ], 404);
    }

    private function matchPath(
        string $routePath,
        string $requestPath
    ): ?array {
        $routeSegments = explode(
            '/',
            trim($routePath, '/')
        );

        $requestSegments = explode(
            '/',
            trim($requestPath, '/')
        );

        if (count($routeSegments) !== count($requestSegments)) {
            return null;
        }

        $params = [];

        foreach ($routeSegments as $index => $routeSegment) {
            $requestSegment = $requestSegments[$index];

            if (
                preg_match(
                    '/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/',
                    $routeSegment,
                    $matches
                )
            ) {
                $params[$matches[1]] = urldecode($requestSegment);

                continue;
            }

            if ($routeSegment !== $requestSegment) {
                return null;
            }
        }

        return $params;
    }
}