<?php

declare(strict_types=1);

namespace MultiSS\Services\Concerns;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Request;
use MultiSS\Integrations\ProviderFactory;
use MultiSS\Repositories\DemoPaymentRepository;
use OutOfBoundsException;

trait DemoPaymentOperations
{
    public function getPayment(
        array $user,
        int $paymentId
    ): array {
        $userId =
            $this->demoVerifiedUserId(
                $user
            );

        if ($paymentId <= 0) {
            throw new InvalidArgumentException(
                'Invalid payment ID.'
            );
        }

        $payment =
            (new DemoPaymentRepository())
                ->findOwnedPayment(
                    $paymentId,
                    $userId
                );

        if ($payment === null) {
            throw new OutOfBoundsException(
                'Payment not found.'
            );
        }

        return $payment;
    }

    public function processDemoPayment(
        array $user,
        array $data
    ): array {
        $userId =
            $this->demoVerifiedUserId(
                $user
            );

        $orderId =
            $this->demoPositiveInt(
                $data['order_id']
                    ?? null,
                'Order ID'
            );

        $outcome =
            trim(
                (string) (
                    $data['outcome']
                    ?? ''
                )
            );

        if ($outcome === '') {
            throw new InvalidArgumentException(
                'Payment outcome is required.'
            );
        }

        $repository =
            new DemoPaymentRepository();

        $payment =
            $repository
                ->findOrCreatePendingForOrder(
                    $orderId,
                    $userId
                );

        $gateway = ProviderFactory::demoPayment();

        $event =
            $gateway->createEvent(
                (int) $payment[
                    'payment_id'
                ],
                $outcome,
                isset(
                    $data[
                        'idempotency_key'
                    ]
                )
                    ? (string) $data[
                        'idempotency_key'
                    ]
                    : null
            );

        $result =
            $repository->applyEvent(
                (int) $event[
                    'payment_id'
                ],
                (string) $event[
                    'outcome'
                ],
                (string) $event[
                    'event_key'
                ],
                (string) $event[
                    'payload_hash'
                ],
                $event[
                    'transaction_reference'
                ],
                $userId
            );

        return [
            'payment' =>
                $result,

            /*
             * Returned only for the school/demo
             * flow so the same signed event can
             * be posted to the webhook endpoint
             * when testing idempotency.
             */
            'demo_event' => [
                'payment_id' =>
                    $event[
                        'payment_id'
                    ],

                'outcome' =>
                    $event[
                        'outcome'
                    ],

                'event_key' =>
                    $event[
                        'event_key'
                    ],

                'transaction_reference' =>
                    $event[
                        'transaction_reference'
                    ],

                'signature' =>
                    $event[
                        'signature'
                    ],
            ],
        ];
    }

    public function handleDemoWebhook(
        Request $request
    ): array {
        $gateway = ProviderFactory::demoPayment();

        $event =
            $gateway
                ->verifyAndNormalizeWebhook(
                    $request->body(),
                    $request->header(
                        'X-Demo-Signature'
                    )
                );

        return
            (new DemoPaymentRepository())
                ->applyEvent(
                    (int) $event[
                        'payment_id'
                    ],
                    (string) $event[
                        'outcome'
                    ],
                    (string) $event[
                        'event_key'
                    ],
                    (string) $event[
                        'payload_hash'
                    ],
                    $event[
                        'transaction_reference'
                    ],
                    null
                );
    }

    public function refundDemoPayment(
        array $admin,
        int $paymentId,
        array $data
    ): array {
        $adminUserId =
            (int) (
                $admin['user_id']
                ?? 0
            );

        if ($adminUserId <= 0) {
            throw new DomainException(
                'Authentication required.'
            );
        }

        if ($paymentId <= 0) {
            throw new InvalidArgumentException(
                'Invalid payment ID.'
            );
        }

        $reason =
            trim(
                (string) (
                    $data['reason']
                    ?? 'Demo full refund'
                )
            );

        if (mb_strlen($reason) > 500) {
            throw new InvalidArgumentException(
                'Refund reason may not exceed 500 characters.'
            );
        }

        return
            (new DemoPaymentRepository())
                ->refundFull(
                    $paymentId,
                    $adminUserId,
                    $reason === ''
                        ? null
                        : $reason
                );
    }

    private function demoVerifiedUserId(
        array $user
    ): int {
        if (
            ($user['email_verified'] ?? false)
            !== true
        ) {
            throw new DomainException(
                'Email verification is required before payment.'
            );
        }

        $userId =
            (int) (
                $user['user_id']
                ?? 0
            );

        if ($userId <= 0) {
            throw new DomainException(
                'Authentication required.'
            );
        }

        return $userId;
    }

    private function demoPositiveInt(
        mixed $value,
        string $field
    ): int {
        $validated =
            filter_var(
                $value,
                FILTER_VALIDATE_INT,
                [
                    'options' => [
                        'min_range' => 1,
                    ],
                ]
            );

        if ($validated === false) {
            throw new InvalidArgumentException(
                $field
                . ' must be a positive integer.'
            );
        }

        return (int) $validated;
    }
}