<?php

declare(strict_types=1);

namespace MultiSS\Integrations;

/** Secret-free configuration inventory. This is not a live-provider health check. */
final class IntegrationReadiness
{
    public static function inspect(array $env): array
    {
        $read = static fn (string $key, string $fallback = ''): string =>
            trim((string) ($env[$key] ?? $fallback));
        $production = in_array(strtolower($read('APP_ENV', 'local')), ['production', 'prod'], true);
        $payment = strtolower($read('PAYMENT_GATEWAY', 'demo'));
        $distance = strtolower($read('DISTANCE_PROVIDER', 'demo'));

        $payfastConfigured = $read('PAYFAST_MERCHANT_ID') !== ''
            && $read('PAYFAST_MERCHANT_KEY') !== ''
            && $read('PAYFAST_RETURN_URL') !== ''
            && $read('PAYFAST_CANCEL_URL') !== ''
            && $read('PAYFAST_NOTIFY_URL') !== '';
        $smtpConfigured = $read('MAIL_HOST') !== ''
            && $read('MAIL_FROM_ADDRESS') !== '';

        $paymentState = match ($payment) {
            'demo' => $production ? 'blocked_in_production' : 'demo_only',
            'payfast' => $payfastConfigured ? 'configured_not_live_verified' : 'configuration_incomplete',
            default => 'unsupported',
        };
        $distanceState = $distance === 'demo'
            ? ($production ? 'blocked_in_production' : 'demo_only')
            : 'adapter_not_implemented';

        return [
            'scope' => 'configuration_only',
            'payment' => ['provider' => $payment, 'state' => $paymentState],
            'distance' => ['provider' => $distance, 'state' => $distanceState],
            'email' => ['provider' => 'smtp', 'state' => $smtpConfigured ? 'configured_not_live_verified' : 'configuration_incomplete'],
            'vendor_payouts' => ['provider' => 'none', 'state' => 'not_implemented'],
            'production_blockers' => array_values(array_filter([
                $production && $payment === 'demo' ? 'Demo payments selected in production.' : null,
                $production && $distance === 'demo' ? 'Demo distance selected in production.' : null,
                $production && !$smtpConfigured ? 'SMTP configuration is incomplete.' : null,
                $production && $payment === 'payfast' && !$payfastConfigured ? 'PayFast settings are incomplete.' : null,
            ])),
        ];
    }
}
