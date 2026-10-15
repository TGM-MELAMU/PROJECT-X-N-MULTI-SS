<?php

declare(strict_types=1);

namespace MultiSS\Contracts;

interface PaymentGatewayInterface
{
    public function name(): string;

    public function createEvent(
        int $paymentId,
        string $outcome,
        ?string $idempotencyKey = null
    ): array;

    public function verifyAndNormalizeWebhook(
        array $payload,
        ?string $signature
    ): array;
}