<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class PaymentRecordRepository
{
    private PDO $pdo;

    public function __construct(
        ?PDO $pdo = null
    ) {
        $this->pdo =
            $pdo ?? Database::connection();
    }

    public function createInitialPending(
        int $orderId,
        string $amount,
        string $gateway,
        string $paymentMethod
    ): array {
        $statement =
            $this->pdo->prepare(
                '
                SELECT
                    payment_id,
                    payment_status,
                    amount

                FROM payments

                WHERE
                    order_id = :order_id
                    AND payment_gateway =
                        :payment_gateway
                    AND payment_status IN (
                        \'pending\',
                        \'successful\'
                    )

                ORDER BY payment_id DESC

                LIMIT 1
                '
            );

        $statement->execute([
            'order_id' =>
                $orderId,

            'payment_gateway' =>
                $gateway,
        ]);

        $existing =
            $statement->fetch();

        if ($existing !== false) {
            return [
                'payment_id' =>
                    (int) $existing[
                        'payment_id'
                    ],

                'payment_status' =>
                    (string) $existing[
                        'payment_status'
                    ],

                'amount' =>
                    (float) $existing[
                        'amount'
                    ],
            ];
        }

        $insert =
            $this->pdo->prepare(
                '
                INSERT INTO payments (
                    order_id,
                    payment_gateway,
                    transaction_reference,
                    payment_method,
                    amount,
                    payment_status
                )
                VALUES (
                    :order_id,
                    :payment_gateway,
                    NULL,
                    :payment_method,
                    :amount,
                    \'pending\'
                )
                '
            );

        $insert->execute([
            'order_id' =>
                $orderId,

            'payment_gateway' =>
                $gateway,

            'payment_method' =>
                $paymentMethod,

            'amount' =>
                $amount,
        ]);

        return [
            'payment_id' =>
                (int) $this->pdo
                    ->lastInsertId(),

            'payment_status' =>
                'pending',

            'amount' =>
                (float) $amount,
        ];
    }
}