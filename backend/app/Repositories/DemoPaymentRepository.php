<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use DomainException;
use MultiSS\Core\Database;
use OutOfBoundsException;
use PDO;
use Throwable;

final class DemoPaymentRepository
{
    private PDO $pdo;

    public function __construct(
        ?PDO $pdo = null
    ) {
        $this->pdo =
            $pdo ?? Database::connection();
    }

    public function findOwnedPayment(
        int $paymentId,
        int $userId
    ): ?array {
        $statement =
            $this->pdo->prepare(
                '
                SELECT
                    p.payment_id,
                    p.order_id,
                    p.payment_gateway,
                    p.transaction_reference,
                    p.payment_method,
                    p.amount,
                    p.payment_status,
                    p.paid_at,
                    p.created_at,
                    p.updated_at,

                    o.order_number,
                    o.order_status

                FROM payments p

                INNER JOIN orders o
                    ON o.order_id = p.order_id

                WHERE
                    p.payment_id = :payment_id
                    AND o.user_id = :user_id

                LIMIT 1
                '
            );

        $statement->execute([
            'payment_id' =>
                $paymentId,

            'user_id' =>
                $userId,
        ]);

        $payment =
            $statement->fetch();

        if ($payment === false) {
            return null;
        }

        return $this->formatPayment(
            $payment
        );
    }

    public function findOrCreatePendingForOrder(
        int $orderId,
        int $userId
    ): array {
        $this->pdo->beginTransaction();

        try {
            $orderStatement =
                $this->pdo->prepare(
                    '
                    SELECT
                        order_id,
                        order_number,
                        total_amount,
                        order_status

                    FROM orders

                    WHERE
                        order_id = :order_id
                        AND user_id = :user_id

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

            $paidStatement =
                $this->pdo->prepare(
                    '
                    SELECT payment_id

                    FROM payments

                    WHERE
                        order_id = :order_id
                        AND payment_status IN (
                            \'successful\',
                            \'partially_refunded\',
                            \'refunded\'
                        )

                    LIMIT 1
                    '
                );

            $paidStatement->execute([
                'order_id' => $orderId,
            ]);

            if (
                $paidStatement->fetchColumn()
                !== false
            ) {
                throw new DomainException(
                    'This order already has a completed payment.'
                );
            }

            if (
                !in_array(
                    $order['order_status'],
                    [
                        'pending_payment',
                        'payment_failed',
                    ],
                    true
                )
            ) {
                throw new DomainException(
                    'This order is not awaiting payment.'
                );
            }

            $pendingStatement =
                $this->pdo->prepare(
                    '
                    SELECT
                        payment_id,
                        order_id,
                        payment_gateway,
                        transaction_reference,
                        payment_method,
                        amount,
                        payment_status,
                        paid_at,
                        created_at,
                        updated_at

                    FROM payments

                    WHERE
                        order_id = :order_id
                        AND payment_gateway = \'Demo\'
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
                            \'Demo\',
                            NULL,
                            \'demo\',
                            :amount,
                            \'pending\'
                        )
                        '
                    );

                $insert->execute([
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

                    'order_id' =>
                        $orderId,

                    'payment_gateway' =>
                        'Demo',

                    'transaction_reference' =>
                        null,

                    'payment_method' =>
                        'demo',

                    'amount' =>
                        $order[
                            'total_amount'
                        ],

                    'payment_status' =>
                        'pending',

                    'paid_at' =>
                        null,

                    'created_at' =>
                        null,

                    'updated_at' =>
                        null,
                ];
            }

            if (
                $order['order_status']
                === 'payment_failed'
            ) {
                $resetOrder =
                    $this->pdo->prepare(
                        '
                        UPDATE orders
                        SET order_status =
                            \'pending_payment\'
                        WHERE order_id =
                            :order_id
                        '
                    );

                $resetOrder->execute([
                    'order_id' =>
                        $orderId,
                ]);

                $resetFulfillment =
                    $this->pdo->prepare(
                        '
                        UPDATE order_fulfillments
                        SET fulfillment_status =
                            \'payment_pending\'
                        WHERE order_id =
                            :order_id
                        '
                    );

                $resetFulfillment->execute([
                    'order_id' =>
                        $orderId,
                ]);
            }

            $this->pdo->commit();

            $payment[
                'order_number'
            ] =
                $order[
                    'order_number'
                ];

            $payment[
                'order_status'
            ] =
                'pending_payment';

            return $this->formatPayment(
                $payment
            );
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    public function applyEvent(
        int $paymentId,
        string $outcome,
        string $eventKey,
        string $payloadHash,
        ?string $transactionReference,
        ?int $userId
    ): array {
        $this->pdo->beginTransaction();

        try {
            $sql = '
                SELECT
                    p.payment_id,
                    p.order_id,
                    p.payment_gateway,
                    p.transaction_reference,
                    p.payment_method,
                    p.amount,
                    p.payment_status,
                    p.paid_at,

                    o.order_number,
                    o.order_status,
                    o.user_id,
                    o.total_amount

                FROM payments p

                INNER JOIN orders o
                    ON o.order_id =
                        p.order_id

                WHERE
                    p.payment_id =
                        :payment_id
            ';

            $params = [
                'payment_id' =>
                    $paymentId,
            ];

            if ($userId !== null) {
                $sql .= '
                    AND o.user_id = :user_id
                ';

                $params['user_id'] =
                    $userId;
            }

            $sql .= '
                LIMIT 1
                FOR UPDATE
            ';

            $paymentStatement =
                $this->pdo->prepare(
                    $sql
                );

            $paymentStatement->execute(
                $params
            );

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
                ] !== 'Demo'
            ) {
                throw new DomainException(
                    'Payment gateway mismatch.'
                );
            }

            $eventInsert =
                $this->pdo->prepare(
                    '
                    INSERT IGNORE INTO
                        payment_webhook_events (
                            payment_id,
                            payment_gateway,
                            event_key,
                            payload_hash,
                            processing_status
                        )
                    VALUES (
                        :payment_id,
                        \'Demo\',
                        :event_key,
                        :payload_hash,
                        \'received\'
                    )
                    '
                );

            $eventInsert->execute([
                'payment_id' =>
                    $paymentId,

                'event_key' =>
                    $eventKey,

                'payload_hash' =>
                    $payloadHash,
            ]);

            if ($eventInsert->rowCount() === 0) {
                $this->pdo->commit();

                return [
                    'already_processed' =>
                        true,

                    'payment_id' =>
                        $paymentId,

                    'order_id' =>
                        (int) $payment[
                            'order_id'
                        ],

                    'order_number' =>
                        (string) $payment[
                            'order_number'
                        ],

                    'payment_status' =>
                        (string) $payment[
                            'payment_status'
                        ],

                    'order_status' =>
                        (string) $payment[
                            'order_status'
                        ],
                ];
            }

            if ($outcome === 'pending') {
                if (
                    $payment[
                        'payment_status'
                    ] !== 'pending'
                ) {
                    $this->finishEvent(
                        $eventKey,
                        'ignored'
                    );

                    $this->pdo->commit();

                    return [
                        'already_processed' =>
                            true,

                        'payment_id' =>
                            $paymentId,

                        'order_id' =>
                            (int) $payment[
                                'order_id'
                            ],

                        'order_number' =>
                            (string) $payment[
                                'order_number'
                            ],

                        'payment_status' =>
                            (string) $payment[
                                'payment_status'
                            ],

                        'order_status' =>
                            (string) $payment[
                                'order_status'
                            ],
                    ];
                }

                $this->finishEvent(
                    $eventKey,
                    'processed'
                );

                $this->pdo->commit();

                return [
                    'already_processed' =>
                        false,

                    'payment_id' =>
                        $paymentId,

                    'order_id' =>
                        (int) $payment[
                            'order_id'
                        ],

                    'order_number' =>
                        (string) $payment[
                            'order_number'
                        ],

                    'payment_status' =>
                        'pending',

                    'order_status' =>
                        (string) $payment[
                            'order_status'
                        ],
                ];
            }

            if ($outcome === 'failed') {
                if (
                    $payment[
                        'payment_status'
                    ] === 'failed'
                ) {
                    $this->finishEvent(
                        $eventKey,
                        'ignored'
                    );

                    $this->pdo->commit();

                    return [
                        'already_processed' =>
                            true,

                        'payment_id' =>
                            $paymentId,

                        'order_id' =>
                            (int) $payment[
                                'order_id'
                            ],

                        'order_number' =>
                            (string) $payment[
                                'order_number'
                            ],

                        'payment_status' =>
                            'failed',

                        'order_status' =>
                            (string) $payment[
                                'order_status'
                            ],
                    ];
                }

                if (
                    $payment[
                        'payment_status'
                    ] !== 'pending'
                ) {
                    throw new DomainException(
                        'This payment cannot be marked failed.'
                    );
                }

                $updatePayment =
                    $this->pdo->prepare(
                        '
                        UPDATE payments
                        SET payment_status =
                            \'failed\'
                        WHERE payment_id =
                            :payment_id
                        '
                    );

                $updatePayment->execute([
                    'payment_id' =>
                        $paymentId,
                ]);

                $updateOrder =
                    $this->pdo->prepare(
                        '
                        UPDATE orders
                        SET order_status =
                            \'payment_failed\'
                        WHERE order_id =
                            :order_id
                          AND order_status =
                            \'pending_payment\'
                        '
                    );

                $updateOrder->execute([
                    'order_id' =>
                        (int) $payment[
                            'order_id'
                        ],
                ]);

                $this->finishEvent(
                    $eventKey,
                    'processed'
                );

                $this->pdo->commit();

                return [
                    'already_processed' =>
                        false,

                    'payment_id' =>
                        $paymentId,

                    'order_id' =>
                        (int) $payment[
                            'order_id'
                        ],

                    'order_number' =>
                        (string) $payment[
                            'order_number'
                        ],

                    'payment_status' =>
                        'failed',

                    'order_status' =>
                        'payment_failed',
                ];
            }

            if (
                $payment[
                    'payment_status'
                ] === 'successful'
            ) {
                if (
                    $payment[
                        'transaction_reference'
                    ] !== null
                    && $transactionReference !== null
                    && !hash_equals(
                        (string) $payment[
                            'transaction_reference'
                        ],
                        $transactionReference
                    )
                ) {
                    throw new DomainException(
                        'Transaction reference mismatch.'
                    );
                }

                $this->finishEvent(
                    $eventKey,
                    'ignored'
                );

                $this->pdo->commit();

                return [
                    'already_processed' =>
                        true,

                    'payment_id' =>
                        $paymentId,

                    'order_id' =>
                        (int) $payment[
                            'order_id'
                        ],

                    'order_number' =>
                        (string) $payment[
                            'order_number'
                        ],

                    'payment_status' =>
                        'successful',

                    'order_status' =>
                        (string) $payment[
                            'order_status'
                        ],
                ];
            }

            if (
                $payment[
                    'payment_status'
                ] !== 'pending'
            ) {
                throw new DomainException(
                    'This payment cannot be completed.'
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

            if ($transactionReference === null) {
                throw new DomainException(
                    'Successful demo payment requires a transaction reference.'
                );
            }

            $duplicateReference =
                $this->pdo->prepare(
                    '
                    SELECT payment_id

                    FROM payments

                    WHERE
                        payment_gateway =
                            \'Demo\'
                        AND transaction_reference =
                            :reference
                        AND payment_id <>
                            :payment_id

                    LIMIT 1
                    '
                );

            $duplicateReference->execute([
                'reference' =>
                    $transactionReference,

                'payment_id' =>
                    $paymentId,
            ]);

            if (
                $duplicateReference
                    ->fetchColumn()
                !== false
            ) {
                throw new DomainException(
                    'Demo transaction reference has already been used.'
                );
            }

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
                        oi.order_id =
                            :order_id

                    ORDER BY
                        oi.variant_id ASC

                    FOR UPDATE
                    '
                );

            $itemsStatement->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $items =
                $itemsStatement->fetchAll();

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
                        'Insufficient inventory to complete payment.'
                    );
                }

                $newQuantity =
                    $previousQuantity
                    - $soldQuantity;

                $inventoryUpdate =
                    $this->pdo->prepare(
                        '
                        UPDATE inventory
                        SET quantity_in_stock =
                            :new_quantity
                        WHERE variant_id =
                            :variant_id
                        '
                    );

                $inventoryUpdate->execute([
                    'new_quantity' =>
                        $newQuantity,

                    'variant_id' =>
                        (int) $item[
                            'variant_id'
                        ],
                ]);

                $movement =
                    $this->pdo->prepare(
                        '
                        INSERT INTO
                            inventory_movements (
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

                $movement->execute([
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
                        'Demo payment sale for order '
                        . $payment[
                            'order_number'
                        ],
                ]);
            }

            $updatePayment =
                $this->pdo->prepare(
                    '
                    UPDATE payments
                    SET
                        transaction_reference =
                            :transaction_reference,
                        payment_method =
                            \'demo\',
                        payment_status =
                            \'successful\',
                        paid_at =
                            CURRENT_TIMESTAMP
                    WHERE payment_id =
                        :payment_id
                    '
                );

            $updatePayment->execute([
                'transaction_reference' =>
                    $transactionReference,

                'payment_id' =>
                    $paymentId,
            ]);

            $updateOrder =
                $this->pdo->prepare(
                    '
                    UPDATE orders
                    SET order_status =
                        \'confirmed\'
                    WHERE order_id =
                        :order_id
                    '
                );

            $updateOrder->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $updateVendorOrders =
                $this->pdo->prepare(
                    '
                    UPDATE vendor_orders
                    SET vendor_order_status =
                        \'confirmed\'
                    WHERE
                        order_id = :order_id
                        AND vendor_order_status =
                            \'new\'
                    '
                );

            $updateVendorOrders->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $updateFulfillment =
                $this->pdo->prepare(
                    '
                    UPDATE order_fulfillments
                    SET fulfillment_status =
                        \'payment_successful\'
                    WHERE
                        order_id = :order_id
                        AND fulfillment_status =
                            \'payment_pending\'
                    '
                );

            $updateFulfillment->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $this->finishEvent(
                $eventKey,
                'processed'
            );

            $this->pdo->commit();

            return [
                'already_processed' =>
                    false,

                'payment_id' =>
                    $paymentId,

                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],

                'order_number' =>
                    (string) $payment[
                        'order_number'
                    ],

                'payment_status' =>
                    'successful',

                'order_status' =>
                    'confirmed',
            ];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    public function refundFull(
        int $paymentId,
        int $adminUserId,
        ?string $reason
    ): array {
        $this->pdo->beginTransaction();

        try {
            $statement =
                $this->pdo->prepare(
                    '
                    SELECT
                        p.payment_id,
                        p.order_id,
                        p.payment_gateway,
                        p.amount,
                        p.payment_status,

                        o.order_number,
                        o.order_status

                    FROM payments p

                    INNER JOIN orders o
                        ON o.order_id =
                            p.order_id

                    WHERE p.payment_id =
                        :payment_id

                    LIMIT 1

                    FOR UPDATE
                    '
                );

            $statement->execute([
                'payment_id' =>
                    $paymentId,
            ]);

            $payment =
                $statement->fetch();

            if ($payment === false) {
                throw new OutOfBoundsException(
                    'Payment not found.'
                );
            }

            if (
                $payment[
                    'payment_gateway'
                ] !== 'Demo'
            ) {
                throw new DomainException(
                    'Only demo payments can use the demo refund flow.'
                );
            }

            if (
                $payment[
                    'payment_status'
                ] === 'refunded'
            ) {
                throw new DomainException(
                    'This payment has already been refunded.'
                );
            }

            if (
                $payment[
                    'payment_status'
                ] !== 'successful'
            ) {
                throw new DomainException(
                    'Only successful payments can be refunded.'
                );
            }

            $existingRefund =
                $this->pdo->prepare(
                    '
                    SELECT refund_id
                    FROM refunds
                    WHERE
                        payment_id = :payment_id
                        AND refund_status =
                            \'successful\'
                    LIMIT 1
                    '
                );

            $existingRefund->execute([
                'payment_id' =>
                    $paymentId,
            ]);

            if (
                $existingRefund
                    ->fetchColumn()
                !== false
            ) {
                throw new DomainException(
                    'This payment has already been refunded.'
                );
            }

            $refundReference =
                'DEMO-RF-'
                . $paymentId
                . '-'
                . strtoupper(
                    bin2hex(
                        random_bytes(4)
                    )
                );

            $refundInsert =
                $this->pdo->prepare(
                    '
                    INSERT INTO refunds (
                        order_id,
                        payment_id,
                        refund_reference,
                        refund_amount,
                        refund_reason,
                        refund_status,
                        requested_by,
                        approved_by,
                        approved_at,
                        processed_at
                    )
                    VALUES (
                        :order_id,
                        :payment_id,
                        :refund_reference,
                        :refund_amount,
                        :refund_reason,
                        \'successful\',
                        :requested_by,
                        :approved_by,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    '
                );

            $refundInsert->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],

                'payment_id' =>
                    $paymentId,

                'refund_reference' =>
                    $refundReference,

                'refund_amount' =>
                    $payment[
                        'amount'
                    ],

                'refund_reason' =>
                    $reason,

                'requested_by' =>
                    $adminUserId,

                'approved_by' =>
                    $adminUserId,
            ]);

            $refundId =
                (int) $this->pdo
                    ->lastInsertId();

            $itemsStatement =
                $this->pdo->prepare(
                    '
                    SELECT
                        oi.order_item_id,
                        oi.variant_id,
                        oi.quantity,
                        oi.line_total,
                        oi.commission_amount,
                        oi.vendor_net_amount,
                        i.quantity_in_stock

                    FROM order_items oi

                    INNER JOIN inventory i
                        ON i.variant_id =
                            oi.variant_id

                    WHERE oi.order_id =
                        :order_id

                    ORDER BY
                        oi.variant_id ASC

                    FOR UPDATE
                    '
                );

            $itemsStatement->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $items =
                $itemsStatement->fetchAll();

            if ($items === []) {
                throw new DomainException(
                    'Order has no refundable items.'
                );
            }

            foreach ($items as $item) {
                $refundItem =
                    $this->pdo->prepare(
                        '
                        INSERT INTO refund_items (
                            refund_id,
                            order_item_id,
                            quantity,
                            refund_amount,
                            commission_reversal,
                            vendor_reversal
                        )
                        VALUES (
                            :refund_id,
                            :order_item_id,
                            :quantity,
                            :refund_amount,
                            :commission_reversal,
                            :vendor_reversal
                        )
                        '
                    );

                $refundItem->execute([
                    'refund_id' =>
                        $refundId,

                    'order_item_id' =>
                        (int) $item[
                            'order_item_id'
                        ],

                    'quantity' =>
                        (int) $item[
                            'quantity'
                        ],

                    'refund_amount' =>
                        $item[
                            'line_total'
                        ],

                    'commission_reversal' =>
                        $item[
                            'commission_amount'
                        ],

                    'vendor_reversal' =>
                        $item[
                            'vendor_net_amount'
                        ],
                ]);

                $previousQuantity =
                    (int) $item[
                        'quantity_in_stock'
                    ];

                $returnedQuantity =
                    (int) $item[
                        'quantity'
                    ];

                $newQuantity =
                    $previousQuantity
                    + $returnedQuantity;

                $inventoryUpdate =
                    $this->pdo->prepare(
                        '
                        UPDATE inventory
                        SET quantity_in_stock =
                            :new_quantity
                        WHERE variant_id =
                            :variant_id
                        '
                    );

                $inventoryUpdate->execute([
                    'new_quantity' =>
                        $newQuantity,

                    'variant_id' =>
                        (int) $item[
                            'variant_id'
                        ],
                ]);

                $movement =
                    $this->pdo->prepare(
                        '
                        INSERT INTO
                            inventory_movements (
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
                            \'return\',
                            :quantity_change,
                            :previous_quantity,
                            :new_quantity,
                            :performed_by,
                            :notes
                        )
                        '
                    );

                $movement->execute([
                    'variant_id' =>
                        (int) $item[
                            'variant_id'
                        ],

                    'quantity_change' =>
                        $returnedQuantity,

                    'previous_quantity' =>
                        $previousQuantity,

                    'new_quantity' =>
                        $newQuantity,

                    'performed_by' =>
                        $adminUserId,

                    'notes' =>
                        'Demo refund for order '
                        . $payment[
                            'order_number'
                        ],
                ]);
            }

            $updatePayment =
                $this->pdo->prepare(
                    '
                    UPDATE payments
                    SET payment_status =
                        \'refunded\'
                    WHERE payment_id =
                        :payment_id
                    '
                );

            $updatePayment->execute([
                'payment_id' =>
                    $paymentId,
            ]);

            $updateOrder =
                $this->pdo->prepare(
                    '
                    UPDATE orders
                    SET order_status =
                        \'cancelled\'
                    WHERE order_id =
                        :order_id
                    '
                );

            $updateOrder->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $updateVendorOrders =
                $this->pdo->prepare(
                    '
                    UPDATE vendor_orders
                    SET vendor_order_status =
                        \'refunded\'
                    WHERE order_id =
                        :order_id
                    '
                );

            $updateVendorOrders->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $updateFulfillment =
                $this->pdo->prepare(
                    '
                    UPDATE order_fulfillments
                    SET fulfillment_status =
                        \'cancelled\'
                    WHERE order_id =
                        :order_id
                    '
                );

            $updateFulfillment->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $updateShipments =
                $this->pdo->prepare(
                    '
                    UPDATE shipments
                    SET shipment_status =
                        \'cancelled\'
                    WHERE
                        order_id = :order_id
                        AND shipment_status IN (
                            \'pending\',
                            \'created\'
                        )
                    '
                );

            $updateShipments->execute([
                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],
            ]);

            $reverseSplits =
                $this->pdo->prepare(
                    '
                    UPDATE payment_splits
                    SET
                        split_status =
                            \'reversed\',
                        processed_at =
                            CURRENT_TIMESTAMP
                    WHERE payment_id =
                        :payment_id
                      AND split_status <>
                            \'reversed\'
                    '
                );

            $reverseSplits->execute([
                'payment_id' =>
                    $paymentId,
            ]);

            $this->pdo->commit();

            return [
                'refund_id' =>
                    $refundId,

                'refund_reference' =>
                    $refundReference,

                'refund_status' =>
                    'successful',

                'refund_amount' =>
                    (float) $payment[
                        'amount'
                    ],

                'payment_id' =>
                    $paymentId,

                'payment_status' =>
                    'refunded',

                'order_id' =>
                    (int) $payment[
                        'order_id'
                    ],

                'order_number' =>
                    (string) $payment[
                        'order_number'
                    ],

                'order_status' =>
                    'cancelled',
            ];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    private function finishEvent(
        string $eventKey,
        string $status
    ): void {
        $statement =
            $this->pdo->prepare(
                '
                UPDATE payment_webhook_events
                SET
                    processing_status =
                        :processing_status,
                    processed_at =
                        CURRENT_TIMESTAMP
                WHERE
                    payment_gateway =
                        \'Demo\'
                    AND event_key =
                        :event_key
                '
            );

        $statement->execute([
            'processing_status' =>
                $status,

            'event_key' =>
                $eventKey,
        ]);
    }

    private function formatPayment(
        array $payment
    ): array {
        return [
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
                ] ?? null,

            'payment_gateway' =>
                (string) $payment[
                    'payment_gateway'
                ],

            'transaction_reference' =>
                $payment[
                    'transaction_reference'
                ],

            'payment_method' =>
                $payment[
                    'payment_method'
                ],

            'amount' =>
                (float) $payment[
                    'amount'
                ],

            'payment_status' =>
                (string) $payment[
                    'payment_status'
                ],

            'order_status' =>
                $payment[
                    'order_status'
                ] ?? null,

            'paid_at' =>
                $payment[
                    'paid_at'
                ],

            'created_at' =>
                $payment[
                    'created_at'
                ],

            'updated_at' =>
                $payment[
                    'updated_at'
                ],
        ];
    }
}