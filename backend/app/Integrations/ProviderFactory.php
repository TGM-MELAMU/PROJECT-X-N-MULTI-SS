<?php

declare(strict_types=1);

namespace MultiSS\Integrations;

use MultiSS\Contracts\DistanceProviderInterface;
use MultiSS\Contracts\PaymentGatewayInterface;
use MultiSS\Providers\DemoDistanceProvider;
use MultiSS\Providers\DemoPaymentGateway;
use RuntimeException;

/** Explicit, fail-closed provider selection. No implicit production fallback. */
final class ProviderFactory
{
    public static function distance(array $config): DistanceProviderInterface
    {
        $provider = strtolower(trim((string) ($config['distance_provider'] ?? '')));
        if ($provider !== 'demo') {
            throw new RuntimeException('No configured distance adapter for the selected provider.');
        }
        self::assertDemoAllowed((string) ($config['app_env'] ?? self::environment()));
        $km = filter_var($config['demo_distance_km'] ?? null, FILTER_VALIDATE_FLOAT);
        if ($km === false || !is_finite((float) $km) || $km < 0 || $km > 2000) {
            throw new RuntimeException('Invalid server-controlled demo distance.');
        }
        return new DemoDistanceProvider((float) $km);
    }

    public static function demoPayment(?array $config = null): PaymentGatewayInterface
    {
        $config ??= require __DIR__ . '/../../config/payment_runtime.php';
        if (strtolower(trim((string) ($config['gateway'] ?? ''))) !== 'demo') {
            throw new RuntimeException('Demo payment endpoint is disabled for the selected gateway.');
        }
        self::assertDemoAllowed((string) ($config['app_env'] ?? self::environment()));
        // Existing gateway enforces demo_enabled and a nonempty webhook secret.
        return new DemoPaymentGateway($config);
    }

    private static function assertDemoAllowed(string $environment): void
    {
        if (in_array(strtolower(trim($environment)), ['production', 'prod'], true)) {
            throw new RuntimeException('Demo integration is prohibited in production.');
        }
    }

    private static function environment(): string
    {
        $env = $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? getenv('APP_ENV');
        return is_string($env) && $env !== '' ? $env : 'local';
    }
}
