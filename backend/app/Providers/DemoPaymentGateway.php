<?php

declare(strict_types=1);

namespace MultiSS\Providers;

use InvalidArgumentException;
use MultiSS\Contracts\PaymentGatewayInterface;
use RuntimeException;

final class DemoPaymentGateway
    implements PaymentGatewayInterface
{
    private const LOCAL_SECRET =
        'multiss-local-demo-webhook-only';

    private array $config;

    public function __construct(
        ?array $config = null
    ) {
        $this->config =
            $config
            ?? require __DIR__
                . '/../../config/payment_runtime.php';

        if (
            ($this->config['demo_enabled'] ?? false)
            !== true
        ) {
            throw new RuntimeException(
                'Demo payments are disabled.'
            );
        }

        $secret =
            trim(
                (string) (
                    $this->config[
                        'demo_webhook_secret'
                    ]
                    ?? ''
                )
            );

        if ($secret === '') {
            throw new RuntimeException(
                'Demo webhook secret is not configured.'
            );
        }

        if (
            ($this->config['app_env'] ?? '')
                === 'production'
            && hash_equals(
                self::LOCAL_SECRET,
                $secret
            )
        ) {
            throw new RuntimeException(
                'The local demo webhook secret may not be used in production.'
            );
        }
    }

    public function name(): string
    {
        return 'Demo';
    }

    public function createEvent(
        int $paymentId,
        string $outcome,
        ?string $idempotencyKey = null
    ): array {
        if ($paymentId <= 0) {
            throw new InvalidArgumentException(
                'Payment ID must be a positive integer.'
            );
        }

        $outcome =
            $this->normalizeOutcome(
                $outcome
            );

        $eventKey =
            $this->eventKey(
                $paymentId,
                $outcome,
                $idempotencyKey
            );

        $transactionReference =
            $outcome === 'successful'
                ? $this->transactionReference(
                    $paymentId,
                    $eventKey
                )
                : null;

        $event = [
            'payment_id' =>
                $paymentId,

            'outcome' =>
                $outcome,

            'event_key' =>
                $eventKey,

            'transaction_reference' =>
                $transactionReference,
        ];

        $canonical =
            $this->canonical(
                $event
            );

        $event['payload_hash'] =
            hash(
                'sha256',
                $canonical
            );

        $event['signature'] =
            hash_hmac(
                'sha256',
                $canonical,
                $this->secret()
            );

        return $event;
    }

    public function verifyAndNormalizeWebhook(
        array $payload,
        ?string $signature
    ): array {
        $paymentId =
            filter_var(
                $payload['payment_id']
                    ?? null,
                FILTER_VALIDATE_INT,
                [
                    'options' => [
                        'min_range' => 1,
                    ],
                ]
            );

        if ($paymentId === false) {
            throw new InvalidArgumentException(
                'Invalid demo payment ID.'
            );
        }

        $outcome =
            $this->normalizeOutcome(
                (string) (
                    $payload['outcome']
                    ?? ''
                )
            );

        $eventKey =
            trim(
                (string) (
                    $payload['event_key']
                    ?? ''
                )
            );

        if (
            $eventKey === ''
            || strlen($eventKey) > 150
            || preg_match(
                '/^[A-Za-z0-9._:-]+$/',
                $eventKey
            ) !== 1
        ) {
            throw new InvalidArgumentException(
                'Invalid demo event key.'
            );
        }

        $expected =
            $this->createEvent(
                (int) $paymentId,
                $outcome,
                $eventKey
            );

        $providedReference =
            $payload['transaction_reference']
                ?? null;

        if (
            ($providedReference ?? null)
            !== $expected[
                'transaction_reference'
            ]
        ) {
            throw new InvalidArgumentException(
                'Invalid demo transaction reference.'
            );
        }

        $signature =
            trim(
                (string) $signature
            );

        if (
            $signature === ''
            || !hash_equals(
                $expected['signature'],
                $signature
            )
        ) {
            throw new InvalidArgumentException(
                'Invalid demo webhook signature.'
            );
        }

        return $expected;
    }

    private function normalizeOutcome(
        string $outcome
    ): string {
        $outcome =
            strtolower(
                trim($outcome)
            );

        if ($outcome === 'success') {
            $outcome = 'successful';
        }

        if (
            !in_array(
                $outcome,
                [
                    'successful',
                    'failed',
                    'pending',
                ],
                true
            )
        ) {
            throw new InvalidArgumentException(
                'Outcome must be successful, failed, or pending.'
            );
        }

        return $outcome;
    }

    private function eventKey(
        int $paymentId,
        string $outcome,
        ?string $idempotencyKey
    ): string {
        $idempotencyKey =
            trim(
                (string) $idempotencyKey
            );

        if ($idempotencyKey === '') {
            return
                'demo:'
                . $paymentId
                . ':'
                . $outcome;
        }

        if (
            strlen($idempotencyKey) > 150
            || preg_match(
                '/^[A-Za-z0-9._:-]+$/',
                $idempotencyKey
            ) !== 1
        ) {
            throw new InvalidArgumentException(
                'Invalid idempotency key.'
            );
        }

        return $idempotencyKey;
    }

    private function transactionReference(
        int $paymentId,
        string $eventKey
    ): string {
        return
            'DEMO-TXN-'
            . $paymentId
            . '-'
            . strtoupper(
                substr(
                    hash(
                        'sha256',
                        $eventKey
                    ),
                    0,
                    16
                )
            );
    }

    private function canonical(
        array $event
    ): string {
        return implode(
            '|',
            [
                (string) $event[
                    'payment_id'
                ],

                (string) $event[
                    'outcome'
                ],

                (string) $event[
                    'event_key'
                ],

                (string) (
                    $event[
                        'transaction_reference'
                    ]
                    ?? ''
                ),
            ]
        );
    }

    private function secret(): string
    {
        return trim(
            (string) $this->config[
                'demo_webhook_secret'
            ]
        );
    }
}