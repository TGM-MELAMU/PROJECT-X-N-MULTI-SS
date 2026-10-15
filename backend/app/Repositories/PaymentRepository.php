<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use DomainException;
use MultiSS\Core\Database;
use OutOfBoundsException;
use PDO;
use Throwable;

final class PaymentRepository
{
    private PDO $pdo;

    public function __construct(
        ?PDO $pdo = null
    ) {
        $this->pdo =
            $pdo ?? Database::connection();
    }

    public function getOrCreatePendingPayFastPayment(
        int $orderId,
        int $userId
    ): array {
        $this->pdo->beginTransaction();

        try {
            $orderStatement =
                $this->pdo->prepare(
                    '
                    SELECT
                        o.order_id,
                        o.order_number,
                        o.user_id,
                        o.total_amount,
                        o.order_status,

                        u.first_name,
                        u.last_name,
                        u.email,

                        oa.contact_number

                    FROM orders o

                    INNER JOIN users u
                        ON u.user_id = o.user_id

                    INNER JOIN order_addresses oa
                        ON oa.order_id = o.order_id

                    WHERE
                        o.order_id = :order_id
                        AND o.user_id = :user_id

                    LIMIT 1

                    FOR UPDATE
                    '
                );

            $orderStatement->execute([
                'order_id' =>
                    $orderId,

                'user_id' =>
                    $userId,
            ]);

            $order =
                $orderStatement->fetch();

            if ($order === false) {
                throw new OutOfBoundsException(
                    'Order not found.'
                );
            }

            if (
                $order['order_status']
                !== 'pending_payment'
            ) {
                throw new DomainException(
                    'This order is not awaiting payment.'
                );
            }

            $successfulStatement =
                $this->pdo->prepare(
                    '
                    SELECT payment_id

                    FROM payments

                    WHERE
                        order_id = :order_id
                        AND payment_gateway = \'PayFast\'
                        AND payment_status = \'successful\'

                    LIMIT 1
                    '
                );

            $successfulStatement->execute([
                'order_id' => $orderId,
            ]);

            if (
                $successfulStatement
                    ->fetchColumn()
                !== false
            ) {
                throw new DomainException(
                    'This order has already been paid.'
                );
            }

            $pendingStatement =
                $this->pdo->prepare(
                    '
                    SELECT
                        payment_id,
                        amount,
                        payment_status

                    FROM payments

                    WHERE
                        order_id = :order_id
                        AND payment_gateway = \'PayFast\'
                        AND payment_status = \'pending\'

                    ORDER BY payment_id DESC

                    LIMIT 1
                    '
                );

            $pendingStatement->execute([
                'order_id' => $orderId,
            ]);

            $payment =
                $pendingStatement->fetch();

            if ($payment === false) {
                $insertStatement =
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
                            \'PayFast\',
                            NULL,
                            NULL,
                            :amount,
                            \'pending\'
                        )
                        '
                    );

                $insertStatement->execute([
                    'order_id' =>
                        $orderId,

                    'amount' =>
                        $order[
                            'total_amount'
                        ],
                ]);

                $payment = [
                    'payment_id' =>
                        (int) $this->pdo
                            ->lastInsertId(),

                    'amount' =>
                        $order[
                            'total_amount'
                        ],

                    'payment_status' =>
                        'pending',
                ];
            }

            $this->pdo->commit();

            return [
                'payment_id' =>
                    (int) $payment[
                        'payment_id'
                    ],

                'payment_status' =>
                    $payment[
                        'payment_status'
                    ],

                'order_id' =>
                    (int) $order[
                        'order_id'
                    ],

                'order_number' =>
                    $order[
                        'order_number'
                    ],

                'amount' =>
                    (string) $payment[
                        'amount'
                    ],

                'first_name' =>
                    $order[
                        'first_name'
                    ],

                'last_name' =>
                    $order[
                        'last_name'
                    ],

                'email' =>
                    $order[
                        'email'
                    ],

                'contact_number' =>
                    $order[
                        'contact_number'
                    ],
            ];
        } catch (Throwable $exception) {
            if (
                $this->pdo
                    ->inTransaction()
            ) {
                $this->pdo
                    ->rollBack();
            }

            throw $exception;
        }
    }

    public function findPayFastPayment(
        int $paymentId,
        int $orderId
    ): ?array {
        $statement =
            $this->pdo->prepare(
                '
                SELECT
                    p.payment_id,
                    p.order_id,
                    p.payment_gateway,
                    p.transaction_reference,
                    p.amount AS payment_amount,
                    p.payment_status,

                    o.order_number,
                    o.total_amount,
                    o.order_status

                FROM payments p

                INNER JOIN orders o
                    ON o.order_id = p.order_id

                WHERE
                    p.payment_id = :payment_id
                    AND p.order_id = :order_id
                    AND p.payment_gateway = \'PayFast\'

                LIMIT 1
                '
            );

        $statement->execute([
            'payment_id' =>
                $paymentId,

            'order_id' =>
                $orderId,
        ]);

        $payment =
            $statement->fetch();

        return $payment === false
            ? null
            : $payment;
    }

    public function confirmPayFastPayment(
        int $paymentId,
        int $orderId,
        string $orderNumber,
        string $payFastPaymentId
    ): array {
        $this->pdo->beginTransaction();

        try {
            /*
             * Lock payment and order first.
             * This is what makes repeated PayFast
             * ITNs idempotent.
             */
            $paymentStatement =
                $this->pdo->prepare(
                    '
                    SELECT
                        p.payment_id,
                        p.order_id,
                        p.payment_gateway,
                        p.transaction_reference,
                        p.payment_status,
                        p.amount,

                        o.order_number,
                        o.order_status,
                        o.user_id,
                        o.total_amount

                    FROM payments p

                    INNER JOIN orders o
                        ON o.order_id = p.order_id

                    WHERE
                        p.payment_id = :payment_id
                        AND p.order_id = :order_id

                    LIMIT 1

                    FOR UPDATE
                    '
                );

            $paymentStatement->execute([
                'payment_id' =>
                    $paymentId,

                'order_id' =>
                    $orderId,
            ]);

            $payment =
                $paymentStatement->fetch();

            if ($payment === false) {
                throw new OutOfBoundsException(
                    'Payment not found.'
                );
            }

            if (
                $payment[
                    'payment_gateway'
                ] !== 'PayFast'
            ) {
                throw new DomainException(
                    'Payment gateway mismatch.'
                );
            }

            if (
                !hash_equals(
                    (string) $payment[
                        'order_number'
                    ],
                    $orderNumber
                )
            ) {
                throw new DomainException(
                    'Order reference mismatch.'
                );
            }

            /*
             * PayFast may retry the same ITN.
             * Once successful, do nothing again.
             */
            if (
                $payment[
                    'payment_status'
                ] === 'successful'
            ) {
                if (
                    $payment[
                        'transaction_reference'
                    ] !== null
                    && !hash_equals(
                        (string) $payment[
                            'transaction_reference'
                        ],
                        $payFastPaymentId
                    )
                ) {
                    throw new DomainException(
                        'PayFast transaction reference mismatch.'
                    );
                }

                $this->pdo->commit();

                return [
                    'already_processed' =>
                        true,

                    'payment_id' =>
                        (int) $payment[
                            'payment_id'
                        ],

                    'order_id' =>
                        (int) $payment[
                            'order_id'
                        ],

                    'order_number' =>
                        $payment[
                            'order_number'
                        ],
                ];
            }

            if (
                $payment[
                    'payment_status'
                ] !== 'pending'
            ) {
                throw new DomainException(
                    'Payment is not pending.'
                );
            }

            if (
                $payment[
                    'order_status'
                ] !== 'pending_payment'
            ) {
                throw new DomainException(
                    'Order is not awaiting payment.'
                );
            }

            /*
             * Prevent the same PayFast transaction
             * reference being attached elsewhere.
             */
            $duplicateReferenceStatement =
                $this->pdo->prepare(
                    '
                    SELECT payment_id

                    FROM payments

                    WHERE
                        transaction_reference = :reference
                        AND payment_id <> :payment_id

                    LIMIT 1
                    '
                );

            $duplicateReferenceStatement->execute([
                'reference' =>
                    $payFastPaymentId,

                'payment_id' =>
                    $paymentId,
            ]);

            if (
                $duplicateReferenceStatement
                    ->fetchColumn()
                !== false
            ) {
                throw new DomainException(
                    'PayFast transaction has already been used.'
                );
            }

            /*
             * Lock inventory rows in deterministic
             * variant order.
             */
            $itemsStatement =
                $this->pdo->prepare(
                    '
                    SELECT
                        oi.order_item_id,
                        oi.variant_id,
                        oi.quantity,
                        i.quantity_in_stock

                    FROM order_items oi

                    INNER JOIN inventory i
                        ON i.variant_id =
                           oi.variant_id

                    WHERE
                        oi.order_id = :order_id

                    ORDER BY
                        oi.variant_id ASC

                    FOR UPDATE
                    '
                );

            $itemsStatement->execute([
                'order_id' =>
                    $orderId,
            ]);

            $items =
                $itemsStatement
                    ->fetchAll();

            if ($items === []) {
                throw new DomainException(
                    'Order has no items.'
                );
            }

            foreach ($items as $item) {
                $previousQuantity =
                    (int) $item[
                        'quantity_in_stock'
                    ];

                $soldQuantity =
                    (int) $item[
                        'quantity'
                    ];

                if (
                    $previousQuantity
                    < $soldQuantity
                ) {
                    throw new DomainException(
                        'Insufficient inventory to complete this paid order.'
                    );
                }

                $newQuantity =
                    $previousQuantity
                    - $soldQuantity;

                $inventoryStatement =
                    $this->pdo->prepare(
                        '
                        UPDATE inventory

                        SET
                            quantity_in_stock =
                                :new_quantity

                        WHERE
                            variant_id =
                                :variant_id
                        '
                    );

                $inventoryStatement->execute([
                    'new_quantity' =>
                        $newQuantity,

                    'variant_id' =>
                        (int) $item[
                            'variant_id'
                        ],
                ]);

                $movementStatement =
                    $this->pdo->prepare(
                        '
                        INSERT INTO inventory_movements (
                            variant_id,
                            movement_type,
                            quantity_change,
                            previous_quantity,
                            new_quantity,
                            performed_by,
                            notes
                        )
                        VALUES (
                            :variant_id,
                            \'sale\',
                            :quantity_change,
                            :previous_quantity,
                            :new_quantity,
                            NULL,
                            :notes
                        )
                        '
                    );

                $movementStatement->execute([
                    'variant_id' =>
                        (int) $item[
                            'variant_id'
                        ],

                    'quantity_change' =>
                        -$soldQuantity,

                    'previous_quantity' =>
                        $previousQuantity,

                    'new_quantity' =>
                        $newQuantity,

                    'notes' =>
                        'PayFast sale for order '
                        . $orderNumber,
                ]);
            }

            $updatePayment =
                $this->pdo->prepare(
                    '
                    UPDATE payments

                    SET
                        transaction_reference =
                            :transaction_reference,

                        payment_status =
                            \'successful\',

                        paid_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        payment_id =
                            :payment_id
                    '
                );

            $updatePayment->execute([
                'transaction_reference' =>
                    $payFastPaymentId,

                'payment_id' =>
                    $paymentId,
            ]);

            $updateOrder =
                $this->pdo->prepare(
                    '
                    UPDATE orders

                    SET
                        order_status =
                            \'confirmed\'

                    WHERE
                        order_id =
                            :order_id
                    '
                );

            $updateOrder->execute([
                'order_id' =>
                    $orderId,
            ]);

            $updateVendorOrders =
                $this->pdo->prepare(
                    '
                    UPDATE vendor_orders

                    SET
                        vendor_order_status =
                            \'confirmed\'

                    WHERE
                        order_id =
                            :order_id
                        AND vendor_order_status =
                            \'new\'
                    '
                );

            $updateVendorOrders->execute([
                'order_id' =>
                    $orderId,
            ]);

            $this->pdo->commit();

            return [
                'already_processed' =>
                    false,

                'payment_id' =>
                    $paymentId,

                'order_id' =>
                    $orderId,

                'order_number' =>
                    $orderNumber,
            ];
        } catch (Throwable $exception) {
            if (
                $this->pdo
                    ->inTransaction()
            ) {
                $this->pdo
                    ->rollBack();
            }

            throw $exception;
        }
    }
}