<?php

declare(strict_types=1);

require dirname(__DIR__) . '/backend/bootstrap.php';

use MultiSS\Integrations\IntegrationReadiness;

// CLI only; no HTTP route, no secrets, and no external network calls.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$state = IntegrationReadiness::inspect($_ENV);
echo json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), PHP_EOL;
