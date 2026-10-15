<?php

declare(strict_types=1);

use MultiSS\Repositories\CartRepository;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);

    exit(
        "This script may only be run from the command line."
        . PHP_EOL
    );
}

require dirname(__DIR__) . '/bootstrap.php';

try {
    $repository = new CartRepository();

    $expiredCount =
        $repository->expireAllActiveCarts();

    echo sprintf(
        "Cart expiration complete. %d cart(s) marked abandoned.%s",
        $expiredCount,
        PHP_EOL
    );

    exit(0);
} catch (\Throwable $exception) {
    fwrite(
        STDERR,
        'Cart expiration failed: '
        . $exception->getMessage()
        . PHP_EOL
    );

    exit(1);
}
