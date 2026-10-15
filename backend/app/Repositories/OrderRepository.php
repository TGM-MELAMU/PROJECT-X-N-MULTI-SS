<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use DomainException;
use MultiSS\Core\Database;
use OutOfBoundsException;
use PDO;
use Throwable;

final class OrderRepository
{
    private const VAT_RATE = 15.0;
    private const LOW_STOCK_THRESHOLD = 5;

    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function createPendingOrder(
        int $userId,
        int $addressId,
        string $recipientName,
        string $contactNumber,
        string $orderNumber
    ): array {
        $cartRepository =
            new CartRepository(
                $this->pdo
            );

        $cartRepository
            ->expireActiveCartByUserId(
                $userId
            );

        $this->pdo->beginTransaction();

        try {
            /*
             * Lock and verify the selected address belongs
             * to the authenticated customer.
             */
            $addressStatement = $this->pdo->prepare(
                '
                SELECT
                    address_id,
                    address_line_1,
                    address_line_2,
                    city,
                    province,
                    postal_code,
                    country
                FROM addresses
                WHERE
                    address_id = :address_id
                    AND user_id = :user_id
                LIMIT 1
                FOR UPDATE
                '
            );

            $addressStatement->execute([
                'address_id' => $addressId,
                'user_id' => $userId,
            ]);

            $address = $addressStatement->fetch();

            if ($address === false) {
                throw new OutOfBoundsException(
                    'Address not found.'
                );
            }

            /*
             * Lock the customer's active cart.
             */
            $cartStatement = $this->pdo->prepare(
                '
                SELECT
                    cart_id,
                    cart_status
                FROM carts
                WHERE
                    user_id = :user_id
                    AND cart_status = \'active\'
                    AND created_at >
                        DATE_SUB(
                            CURRENT_TIMESTAMP,
                            INTERVAL 7 DAY
                        )
                ORDER BY cart_id DESC
                LIMIT 1
                FOR UPDATE
                '
            );

            $cartStatement->execute([
                'user_id' => $userId,
            ]);

            $cart = $cartStatement->fetch();

            if ($cart === false) {
                throw new DomainException(
                    'No active cart found.'
                );
            }

            $cartId = (int) $cart['cart_id'];

            /*
             * Reload the complete cart directly from the
             * database inside this transaction.
             *
             * Prices, product state and stock are therefore
             * rechecked immediately before the order is made.
             */
            $itemsStatement = $this->pdo->prepare(
                '
                SELECT
                    ci.cart_item_id,
                    ci.quantity,

                    pv.variant_id,
                    pv.variant_name,
                    pv.sku,
                    pv.selling_price,
                    pv.variant_status,

                    p.product_id,
                    p.product_name,
                    p.vendor_id,
                    p.product_status,
                    p.approval_status,

                    v.vendor_status,

                    COALESCE(
                        i.quantity_in_stock,
                        0
                    ) AS quantity_in_stock

                FROM cart_items ci

                INNER JOIN product_variants pv
                    ON pv.variant_id = ci.variant_id

                INNER JOIN products p
                    ON p.product_id = pv.product_id

                INNER JOIN vendors v
                    ON v.vendor_id = p.vendor_id

                LEFT JOIN inventory i
                    ON i.variant_id = pv.variant_id

                WHERE ci.cart_id = :cart_id

                ORDER BY ci.cart_item_id ASC

                FOR UPDATE
                '
            );

            $itemsStatement->execute([
                'cart_id' => $cartId,
            ]);

            $rows = $itemsStatement->fetchAll();

            if ($rows === []) {
                throw new DomainException(
                    'Your cart is empty.'
                );
            }

            $preparedItems = [];
            $vendorTotals = [];

            $subtotalCents = 0;

            foreach ($rows as $row) {
                $quantity = (int) $row['quantity'];
                $stock = (int) $row['quantity_in_stock'];

                if (
                    $row['variant_status'] !== 'active'
                    || $row['product_status'] !== 'active'
                    || $row['approval_status'] !== 'approved'
                    || $row['vendor_status'] !== 'active'
                ) {
                    throw new DomainException(
                        'One or more products are no longer available.'
                    );
                }

                if (
                    $stock <= self::LOW_STOCK_THRESHOLD
                ) {
                    throw new DomainException(
                        'One or more products are currently out of stock.'
                    );
                }

                if ($quantity > $stock) {
                    throw new DomainException(
                        'One or more cart quantities exceed available stock.'
                    );
                }

                $unitPriceCents =
                    $this->moneyToCents(
                        (string) $row['selling_price']
                    );

                $lineTotalCents =
                    $unitPriceCents * $quantity;

                $commissionPercentage =
                    $this->findCommissionPercentage(
                        (int) $row['product_id']
                    );

                $commissionCents =
                    (int) round(
                        $lineTotalCents
                        * $commissionPercentage
                        / 100
                    );

                $vendorNetCents =
                    $lineTotalCents
                    - $commissionCents;

                $vendorId =
                    (int) $row['vendor_id'];

                $preparedItems[] = [
                    'variant_id' =>
                        (int) $row['variant_id'],

                    'product_id' =>
                        (int) $row['product_id'],

                    'vendor_id' =>
                        $vendorId,

                    'product_name' =>
                        (string) $row['product_name'],

                    'variant_name' =>
                        (string) $row['variant_name'],

                    'sku' =>
                        (string) $row['sku'],

                    'quantity' =>
                        $quantity,

                    'unit_price_cents' =>
                        $unitPriceCents,

                    'line_total_cents' =>
                        $lineTotalCents,

                    'commission_percentage' =>
                        $commissionPercentage,

                    'commission_cents' =>
                        $commissionCents,

                    'vendor_net_cents' =>
                        $vendorNetCents,
                ];

                if (
                    !isset(
                        $vendorTotals[$vendorId]
                    )
                ) {
                    $vendorTotals[$vendorId] = [
                        'items_subtotal_cents' => 0,
                        'commission_total_cents' => 0,
                        'vendor_net_total_cents' => 0,
                    ];
                }

                $vendorTotals[$vendorId]
                    ['items_subtotal_cents']
                    += $lineTotalCents;

                $vendorTotals[$vendorId]
                    ['commission_total_cents']
                    += $commissionCents;

                $vendorTotals[$vendorId]
                    ['vendor_net_total_cents']
                    += $vendorNetCents;

                $subtotalCents +=
                    $lineTotalCents;
            }

            /*
             * Selling prices are VAT-inclusive.
             */
            $vatCents =
                (int) round(
                    $subtotalCents
                    * self::VAT_RATE
                    / (100 + self::VAT_RATE)
                );

            /*
             * Delivery placeholder for Phase 4.
             */
            $shippingCents = 0;

            $totalCents =
                $subtotalCents
                + $shippingCents;

            /*
             * Create the customer order.
             */
            $orderStatement = $this->pdo->prepare(
                '
                INSERT INTO orders (
                    order_number,
                    user_id,
                    cart_id,
                    subtotal,
                    vat_amount,
                    shipping_amount,
                    total_amount,
                    order_status
                )
                VALUES (
                    :order_number,
                    :user_id,
                    :cart_id,
                    :subtotal,
                    :vat_amount,
                    :shipping_amount,
                    :total_amount,
                    \'pending_payment\'
                )
                '
            );

            $orderStatement->execute([
                'order_number' =>
                    $orderNumber,

                'user_id' =>
                    $userId,

                'cart_id' =>
                    $cartId,

                'subtotal' =>
                    $this->centsToMoney(
                        $subtotalCents
                    ),

                'vat_amount' =>
                    $this->centsToMoney(
                        $vatCents
                    ),

                'shipping_amount' =>
                    $this->centsToMoney(
                        $shippingCents
                    ),

                'total_amount' =>
                    $this->centsToMoney(
                        $totalCents
                    ),
            ]);

            $orderId =
                (int) $this->pdo->lastInsertId();

            /*
             * Snapshot the address.
             *
             * The order address remains unchanged even if
             * the customer later edits their saved address.
             */
            $orderAddressStatement =
                $this->pdo->prepare(
                    '
                    INSERT INTO order_addresses (
                        order_id,
                        recipient_name,
                        contact_number,
                        address_line_1,
                        address_line_2,
                        city,
                        province,
                        postal_code,
                        country
                    )
                    VALUES (
                        :order_id,
                        :recipient_name,
                        :contact_number,
                        :address_line_1,
                        :address_line_2,
                        :city,
                        :province,
                        :postal_code,
                        :country
                    )
                    '
                );

            $orderAddressStatement->execute([
                'order_id' =>
                    $orderId,

                'recipient_name' =>
                    $recipientName,

                'contact_number' =>
                    $contactNumber,

                'address_line_1' =>
                    $address['address_line_1'],

                'address_line_2' =>
                    $address['address_line_2'],

                'city' =>
                    $address['city'],

                'province' =>
                    $address['province'],

                'postal_code' =>
                    $address['postal_code'],

                'country' =>
                    $address['country'],
            ]);

            /*
             * One vendor_order per vendor.
             */
            $vendorOrderIds = [];

            foreach (
                $vendorTotals
                as $vendorId => $totals
            ) {
                $vendorOrderNumber =
                    'VO-'
                    . $orderId
                    . '-V'
                    . $vendorId;

                $vendorOrderStatement =
                    $this->pdo->prepare(
                        '
                        INSERT INTO vendor_orders (
                            order_id,
                            vendor_id,
                            vendor_order_number,
                            items_subtotal,
                            commission_total,
                            vendor_net_total,
                            vendor_order_status
                        )
                        VALUES (
                            :order_id,
                            :vendor_id,
                            :vendor_order_number,
                            :items_subtotal,
                            :commission_total,
                            :vendor_net_total,
                            \'new\'
                        )
                        '
                    );

                $vendorOrderStatement->execute([
                    'order_id' =>
                        $orderId,

                    'vendor_id' =>
                        $vendorId,

                    'vendor_order_number' =>
                        $vendorOrderNumber,

                    'items_subtotal' =>
                        $this->centsToMoney(
                            $totals[
                                'items_subtotal_cents'
                            ]
                        ),

                    'commission_total' =>
                        $this->centsToMoney(
                            $totals[
                                'commission_total_cents'
                            ]
                        ),

                    'vendor_net_total' =>
                        $this->centsToMoney(
                            $totals[
                                'vendor_net_total_cents'
                            ]
                        ),
                ]);

                $vendorOrderIds[$vendorId] =
                    (int) $this->pdo
                        ->lastInsertId();
            }

            /*
             * Snapshot each item and its commission.
             */
            $orderItemStatement =
                $this->pdo->prepare(
                    '
                    INSERT INTO order_items (
                        order_id,
                        vendor_order_id,
                        variant_id,
                        product_name,
                        variant_name,
                        sku,
                        quantity,
                        unit_price,
                        line_total,
                        commission_percentage,
                        commission_amount,
                        vendor_net_amount
                    )
                    VALUES (
                        :order_id,
                        :vendor_order_id,
                        :variant_id,
                        :product_name,
                        :variant_name,
                        :sku,
                        :quantity,
                        :unit_price,
                        :line_total,
                        :commission_percentage,
                        :commission_amount,
                        :vendor_net_amount
                    )
                    '
                );

            foreach ($preparedItems as $item) {
                $orderItemStatement->execute([
                    'order_id' =>
                        $orderId,

                    'vendor_order_id' =>
                        $vendorOrderIds[
                            $item['vendor_id']
                        ],

                    'variant_id' =>
                        $item['variant_id'],

                    'product_name' =>
                        $item['product_name'],

                    'variant_name' =>
                        $item['variant_name'],

                    'sku' =>
                        $item['sku'],

                    'quantity' =>
                        $item['quantity'],

                    'unit_price' =>
                        $this->centsToMoney(
                            $item[
                                'unit_price_cents'
                            ]
                        ),

                    'line_total' =>
                        $this->centsToMoney(
                            $item[
                                'line_total_cents'
                            ]
                        ),

                    'commission_percentage' =>
                        number_format(
                            $item[
                                'commission_percentage'
                            ],
                            2,
                            '.',
                            ''
                        ),

                    'commission_amount' =>
                        $this->centsToMoney(
                            $item[
                                'commission_cents'
                            ]
                        ),

                    'vendor_net_amount' =>
                        $this->centsToMoney(
                            $item[
                                'vendor_net_cents'
                            ]
                        ),
                ]);
            }

            /*
             * The cart has now become this order.
             *
             * Inventory is intentionally NOT changed here.
             */
            $cartUpdate =
                $this->pdo->prepare(
                    '
                    UPDATE carts
                    SET cart_status = \'converted\'
                    WHERE cart_id = :cart_id
                    '
                );

            $cartUpdate->execute([
                'cart_id' => $cartId,
            ]);

            $this->pdo->commit();

            return [
                'order_id' =>
                    $orderId,

                'order_number' =>
                    $orderNumber,

                'cart_id' =>
                    $cartId,

                'order_status' =>
                    'pending_payment',

                'subtotal' =>
                    (float) $this->centsToMoney(
                        $subtotalCents
                    ),

                'vat_amount' =>
                    (float) $this->centsToMoney(
                        $vatCents
                    ),

                'shipping_amount' =>
                    (float) $this->centsToMoney(
                        $shippingCents
                    ),

                'total_amount' =>
                    (float) $this->centsToMoney(
                        $totalCents
                    ),

                'prices_include_vat' =>
                    true,

                'address_id' =>
                    $addressId,

                'items' =>
                    array_map(
                        fn (array $item): array => [
                            'variant_id' =>
                                $item['variant_id'],

                            'product_name' =>
                                $item['product_name'],

                            'variant_name' =>
                                $item['variant_name'],

                            'sku' =>
                                $item['sku'],

                            'quantity' =>
                                $item['quantity'],

                            'unit_price' =>
                                (float)
                                $this->centsToMoney(
                                    $item[
                                        'unit_price_cents'
                                    ]
                                ),

                            'line_total' =>
                                (float)
                                $this->centsToMoney(
                                    $item[
                                        'line_total_cents'
                                    ]
                                ),

                            'commission_percentage' =>
                                $item[
                                    'commission_percentage'
                                ],

                            'commission_amount' =>
                                (float)
                                $this->centsToMoney(
                                    $item[
                                        'commission_cents'
                                    ]
                                ),

                            'vendor_net_amount' =>
                                (float)
                                $this->centsToMoney(
                                    $item[
                                        'vendor_net_cents'
                                    ]
                                ),
                        ],
                        $preparedItems
                    ),
            ];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }
public function findCustomerOrderByNumber(
    int $userId,
    string $orderNumber
): ?array {
    /*
     * Read the historical order/address snapshot.
     *
     * Ownership is checked directly in SQL to
     * prevent IDOR access to another customer's
     * order.
     */
    $orderStatement =
        $this->pdo->prepare(
            '
            SELECT
                o.order_id,
                o.order_number,
                o.subtotal,
                o.vat_amount,
                o.shipping_amount,
                o.total_amount,
                o.order_status,
                o.created_at,

                oa.recipient_name,
                oa.contact_number,
                oa.address_line_1,
                oa.address_line_2,
                oa.city,
                oa.province,
                oa.postal_code,
                oa.country

            FROM orders o

            LEFT JOIN order_addresses oa
                ON oa.order_id = o.order_id

            WHERE
                o.user_id = :user_id
                AND o.order_number = :order_number

            LIMIT 1
            '
        );

    $orderStatement->execute([
        'user_id' =>
            $userId,

        'order_number' =>
            $orderNumber,
    ]);

    $order =
        $orderStatement->fetch();

    if ($order === false) {
        return null;
    }

    $orderId =
        (int) $order[
            'order_id'
        ];

    /*
     * Read historical item snapshots.
     *
     * Do not join back to products for customer
     * confirmation because the current product
     * may later change.
     */
    $itemsStatement =
        $this->pdo->prepare(
            '
            SELECT
                order_item_id,
                variant_id,
                product_name,
                variant_name,
                sku,
                quantity,
                unit_price,
                line_total

            FROM order_items

            WHERE order_id = :order_id

            ORDER BY order_item_id ASC
            '
        );

    $itemsStatement->execute([
        'order_id' =>
            $orderId,
    ]);

    $items =
        $itemsStatement
            ->fetchAll();

    /*
     * Prefer the successful payment when one
     * exists. Otherwise return the most recent
     * payment attempt.
     */
    $paymentStatement =
        $this->pdo->prepare(
            '
            SELECT
                payment_id,
                payment_gateway,
                transaction_reference,
                amount,
                payment_status,
                paid_at,
                created_at

            FROM payments

            WHERE order_id = :order_id

            ORDER BY
                CASE
                    WHEN payment_status = \'successful\'
                    THEN 0
                    ELSE 1
                END ASC,

                payment_id DESC

            LIMIT 1
            '
        );

    $paymentStatement->execute([
        'order_id' =>
            $orderId,
    ]);

    $payment =
        $paymentStatement->fetch();

    $formattedItems =
        array_map(
            static function (
                array $item
            ): array {
                return [
                    'order_item_id' =>
                        (int) $item[
                            'order_item_id'
                        ],

                    'variant_id' =>
                        (int) $item[
                            'variant_id'
                        ],

                    'product_name' =>
                        (string) $item[
                            'product_name'
                        ],

                    'variant_name' =>
                        (string) $item[
                            'variant_name'
                        ],

                    'sku' =>
                        (string) $item[
                            'sku'
                        ],

                    'quantity' =>
                        (int) $item[
                            'quantity'
                        ],

                    'unit_price' =>
                        (float) $item[
                            'unit_price'
                        ],

                    'line_total' =>
                        (float) $item[
                            'line_total'
                        ],
                ];
            },
            $items
        );

    $formattedPayment = null;

    if ($payment !== false) {
        $formattedPayment = [
            'payment_id' =>
                (int) $payment[
                    'payment_id'
                ],

            'gateway' =>
                (string) $payment[
                    'payment_gateway'
                ],

            'transaction_reference' =>
                $payment[
                    'transaction_reference'
                ] !== null
                    ? (string) $payment[
                        'transaction_reference'
                    ]
                    : null,

            'amount' =>
                (float) $payment[
                    'amount'
                ],

            'status' =>
                (string) $payment[
                    'payment_status'
                ],

            'paid_at' =>
                $payment[
                    'paid_at'
                ],

            'created_at' =>
                $payment[
                    'created_at'
                ],
        ];
    }

    $isPaid =
        $formattedPayment !== null
        && $formattedPayment[
            'status'
        ] === 'successful';

    return [
        'order_id' =>
            $orderId,

        'order_number' =>
            (string) $order[
                'order_number'
            ],

        'order_status' =>
            (string) $order[
                'order_status'
            ],

        'payment_confirmed' =>
            $isPaid,

        'created_at' =>
            $order[
                'created_at'
            ],

        'subtotal' =>
            (float) $order[
                'subtotal'
            ],

        'vat_amount' =>
            (float) $order[
                'vat_amount'
            ],

        'shipping_amount' =>
            (float) $order[
                'shipping_amount'
            ],

        'total_amount' =>
            (float) $order[
                'total_amount'
            ],

        'prices_include_vat' =>
            true,

        'delivery_address' => [
            'recipient_name' =>
                $order[
                    'recipient_name'
                ],

            'contact_number' =>
                $order[
                    'contact_number'
                ],

            'address_line_1' =>
                $order[
                    'address_line_1'
                ],

            'address_line_2' =>
                $order[
                    'address_line_2'
                ],

            'city' =>
                $order[
                    'city'
                ],

            'province' =>
                $order[
                    'province'
                ],

            'postal_code' =>
                $order[
                    'postal_code'
                ],

            'country' =>
                $order[
                    'country'
                ],
        ],

        'items' =>
            $formattedItems,

        'payment' =>
            $formattedPayment,
    ];
}
    private function findCommissionPercentage(
        int $productId
    ): float {
        /*
         * Product-specific rules override
         * category-specific rules.
         */
        $productStatement =
            $this->pdo->prepare(
                '
                SELECT commission_percentage
                FROM commission_rules
                WHERE
                    product_id = :product_id
                    AND status = \'active\'
                LIMIT 1
                '
            );

        $productStatement->execute([
            'product_id' => $productId,
        ]);

        $productCommission =
            $productStatement->fetchColumn();

        if ($productCommission !== false) {
            return
                (float) $productCommission;
        }

        /*
         * Category fallback.
         *
         * If a product belongs to more than one category
         * with an active rule, the highest active
         * category rate is used for now.
         */
        $categoryStatement =
            $this->pdo->prepare(
                '
                SELECT
                    MAX(cr.commission_percentage)

                FROM product_categories pc

                INNER JOIN commission_rules cr
                    ON cr.category_id = pc.category_id

                WHERE
                    pc.product_id = :product_id
                    AND cr.status = \'active\'
                '
            );

        $categoryStatement->execute([
            'product_id' => $productId,
        ]);

        $categoryCommission =
            $categoryStatement->fetchColumn();

        if (
            $categoryCommission === false
            || $categoryCommission === null
        ) {
            return 0.0;
        }

        return
            (float) $categoryCommission;
    }

    private function moneyToCents(
        string $amount
    ): int {
        return
            (int) round(
                ((float) $amount) * 100
            );
    }

    private function centsToMoney(
        int $cents
    ): string {
        return number_format(
            $cents / 100,
            2,
            '.',
            ''
        );
    }
}
