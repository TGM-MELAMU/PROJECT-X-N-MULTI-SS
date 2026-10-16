<?php

declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'MultiSS\\';
    if (!str_starts_with($class, $prefix)) return;
    $file = dirname(__DIR__) . '/backend/app/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (is_file($file)) require_once $file;
});

use MultiSS\Integrations\ProviderFactory;
use MultiSS\Integrations\IntegrationReadiness;
use MultiSS\Integrations\OutboundUrlPolicy;
use MultiSS\Integrations\RetryPolicy;
use MultiSS\Providers\DemoDistanceProvider;
use MultiSS\Providers\DemoPaymentGateway;

$assertions = 0;
function ok(bool $value, string $label): void {
    global $assertions;
    $assertions++;
    if (!$value) throw new RuntimeException('FAIL: ' . $label);
}
function rejects(callable $fn, string $label): void {
    try { $fn(); }
    catch (InvalidArgumentException|RuntimeException $expected) { ok(true, $label); return; }
    ok(false, $label);
}

$distance = ProviderFactory::distance(['distance_provider' => 'demo', 'demo_distance_km' => 12, 'app_env'=>'local']);
ok($distance instanceof DemoDistanceProvider, 'Demo distance factory');
ok($distance->distanceKm(['postal_code'=>'0001']) === 12.0, 'Server-controlled distance');
rejects(fn () => ProviderFactory::distance(['distance_provider'=>'api','demo_distance_km'=>12]), 'Unknown distance fails closed');
rejects(fn () => ProviderFactory::distance(['distance_provider'=>'demo','demo_distance_km'=>12,'app_env'=>'production']), 'Production demo distance blocked');
rejects(fn () => ProviderFactory::distance(['distance_provider'=>'demo','demo_distance_km'=>-1]), 'Negative distance rejected');
rejects(fn () => ProviderFactory::distance(['distance_provider'=>'demo','demo_distance_km'=>'INF']), 'Invalid distance rejected');

$paymentConfig = ['gateway'=>'Demo','app_env'=>'local','demo_enabled'=>true,'demo_webhook_secret'=>'strong-local-test-secret'];
$gateway = ProviderFactory::demoPayment($paymentConfig);
ok($gateway instanceof DemoPaymentGateway, 'Demo payment factory');
ok($gateway->name() === 'Demo', 'Demo payment name');
rejects(fn () => ProviderFactory::demoPayment(array_replace($paymentConfig, ['gateway'=>'PayFast'])), 'Demo endpoint blocked for PayFast');
rejects(fn () => ProviderFactory::demoPayment(array_replace($paymentConfig, ['app_env'=>'production'])), 'Production demo payment blocked');
rejects(fn () => ProviderFactory::demoPayment(array_replace($paymentConfig, ['demo_enabled'=>false])), 'Disabled demo payment blocked');

OutboundUrlPolicy::assertAllowed('https://api.example.com/v1/events', ['api.example.com']);
ok(true, 'Exact HTTPS allowlist');
foreach ([
  'http://api.example.com/x', 'https://api.example.com.evil.com/',
  'https://127.0.0.1/', 'https://user:pass@api.example.com/',
  'https://api.example.com:444/', 'https://api.example.com/#private',
  'https://evil.example/x', 'file:///etc/passwd',
] as $bad) rejects(fn () => OutboundUrlPolicy::assertAllowed($bad, ['api.example.com']), 'URL rejected: '.$bad);

ok(RetryPolicy::shouldRetry('GET', 503, 1), 'GET retry permitted');
ok(!RetryPolicy::shouldRetry('POST', 503, 1), 'POST without idempotency does not retry');
ok(RetryPolicy::shouldRetry('POST', 429, 1, 'event-123'), 'Idempotent POST may retry');
ok(!RetryPolicy::shouldRetry('POST', 400, 1, 'event-123'), 'Nontransient POST does not retry');
ok(!RetryPolicy::shouldRetry('GET', 503, 3), 'Retry budget enforced');

$report = IntegrationReadiness::inspect(['APP_ENV'=>'production','PAYMENT_GATEWAY'=>'demo','DISTANCE_PROVIDER'=>'demo']);
ok($report['scope'] === 'configuration_only', 'No claim of live provider check');
ok(count($report['production_blockers']) >= 2, 'Production demo blockers reported');
ok($report['vendor_payouts']['state'] === 'not_implemented', 'Payouts not misrepresented');
$secret='DO_NOT_PRINT_THIS_SECRET';
$report = IntegrationReadiness::inspect(['PAYFAST_MERCHANT_KEY'=>$secret,'PAYMENT_GATEWAY'=>'payfast']);
ok(!str_contains(json_encode($report),$secret), 'No credentials in status output');
ok($report['payment']['state'] === 'configuration_incomplete', 'Incomplete PayFast does not appear verified');

// Ensure actual consumers are wired to the centralized factories.
$deliveryCode = file_get_contents(dirname(__DIR__).'/backend/app/Services/DeliveryService.php');
$paymentCode = file_get_contents(dirname(__DIR__).'/backend/app/Services/Concerns/DemoPaymentOperations.php');
ok(str_contains($deliveryCode,'ProviderFactory::distance('), 'DeliveryService integration point');
ok(substr_count($paymentCode,'ProviderFactory::demoPayment(') === 2, 'Demo payment processing and webhook integration points');

echo "Phase 11 foundation passed ($assertions assertions).\n";
