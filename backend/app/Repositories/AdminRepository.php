<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use OutOfBoundsException;
use PDO;
use Throwable;

final class AdminRepository
{
    private PDO $pdo;

    public function __construct(
        ?PDO $pdo = null
    ) {
        $this->pdo =
            $pdo ?? Database::connection();
    }

    public function listUsers(
        int $page,
        int $perPage,
        ?string $search
    ): array {
        $offset =
            ($page - 1) * $perPage;

        $where = '';
        $parameters = [];

        if (
            $search !== null
            && $search !== ''
        ) {
            $where = '
                WHERE (
                    u.email LIKE :search_email
                    OR u.first_name LIKE :search_first
                    OR u.last_name LIKE :search_last
                )
            ';

            $value =
                '%' . $search . '%';

            $parameters = [
                'search_email' =>
                    $value,

                'search_first' =>
                    $value,

                'search_last' =>
                    $value,
            ];
        }

        $countStatement =
            $this->pdo->prepare(
                '
                    SELECT COUNT(*)
                    FROM users u
                    ' . $where
            );

        $countStatement->execute(
            $parameters
        );

        $total =
            (int) $countStatement
                ->fetchColumn();

        $statement =
            $this->pdo->prepare(
                '
                    SELECT
                        u.user_id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.phone,
                        u.status,
                        u.email_verified_at,
                        u.created_at,
                        u.updated_at,

                        GROUP_CONCAT(
                            DISTINCT r.role_name
                            ORDER BY r.role_name
                            SEPARATOR \',\'
                        ) AS roles_csv

                    FROM users u

                    LEFT JOIN user_roles ur
                        ON ur.user_id =
                            u.user_id

                    LEFT JOIN roles r
                        ON r.role_id =
                            ur.role_id

                    ' . $where . '

                    GROUP BY
                        u.user_id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.phone,
                        u.status,
                        u.email_verified_at,
                        u.created_at,
                        u.updated_at

                    ORDER BY
                        u.created_at DESC,
                        u.user_id DESC

                    LIMIT ' . (int) $perPage . '
                    OFFSET ' . (int) $offset
            );

        $statement->execute(
            $parameters
        );

        return [
            'rows' =>
                $statement->fetchAll(),

            'total' =>
                $total,
        ];
    }

    public function findUserById(
        int $userId
    ): ?array {
        $statement =
            $this->pdo->prepare(
                '
                    SELECT
                        u.user_id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.phone,
                        u.status,
                        u.email_verified_at,
                        u.created_at,
                        u.updated_at,

                        GROUP_CONCAT(
                            DISTINCT r.role_name
                            ORDER BY r.role_name
                            SEPARATOR \',\'
                        ) AS roles_csv

                    FROM users u

                    LEFT JOIN user_roles ur
                        ON ur.user_id =
                            u.user_id

                    LEFT JOIN roles r
                        ON r.role_id =
                            ur.role_id

                    WHERE
                        u.user_id =
                            :user_id

                    GROUP BY
                        u.user_id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.phone,
                        u.status,
                        u.email_verified_at,
                        u.created_at,
                        u.updated_at

                    LIMIT 1
                '
            );

        $statement->execute([
            'user_id' =>
                $userId,
        ]);

        $user =
            $statement->fetch();

        return $user === false
            ? null
            : $user;
    }

    public function emailExistsForAnotherUser(
        string $email,
        int $userId
    ): bool {
        $statement =
            $this->pdo->prepare(
                '
                    SELECT user_id

                    FROM users

                    WHERE
                        email = :email
                        AND user_id <> :user_id

                    LIMIT 1
                '
            );

        $statement->execute([
            'email' =>
                $email,

            'user_id' =>
                $userId,
        ]);

        return
            $statement->fetchColumn()
            !== false;
    }

    public function availableRoles(): array
    {
        $statement =
            $this->pdo->query(
                '
                    SELECT role_name
                    FROM roles
                    ORDER BY role_name
                '
            );

        return array_map(
            static fn (mixed $role): string =>
                (string) $role,
            $statement->fetchAll(
                PDO::FETCH_COLUMN
            )
        );
    }

    public function updateUser(
        int $userId,
        array $fields,
        ?array $roles
    ): void {
        $this->pdo->beginTransaction();

        try {
            $lock =
                $this->pdo->prepare(
                    '
                        SELECT user_id

                        FROM users

                        WHERE
                            user_id =
                                :user_id

                        LIMIT 1

                        FOR UPDATE
                    '
                );

            $lock->execute([
                'user_id' =>
                    $userId,
            ]);

            if (
                $lock->fetchColumn()
                === false
            ) {
                throw new OutOfBoundsException(
                    'User not found.'
                );
            }

            if ($fields !== []) {
                $allowed = [
                    'first_name',
                    'last_name',
                    'email',
                    'phone',
                    'status',
                ];

                $set = [];

                $parameters = [
                    'user_id' =>
                        $userId,
                ];

                foreach (
                    $fields
                    as $field => $value
                ) {
                    if (
                        !in_array(
                            $field,
                            $allowed,
                            true
                        )
                    ) {
                        continue;
                    }

                    $set[] =
                        $field
                        . ' = :'
                        . $field;

                    $parameters[$field] =
                        $value;
                }

                if ($set !== []) {
                    $statement =
                        $this->pdo->prepare(
                            '
                                UPDATE users
                                SET '
                                . implode(
                                    ', ',
                                    $set
                                )
                                . '
                                WHERE
                                    user_id =
                                        :user_id
                            '
                        );

                    $statement->execute(
                        $parameters
                    );
                }
            }

            if ($roles !== null) {
                $delete =
                    $this->pdo->prepare(
                        '
                            DELETE FROM user_roles
                            WHERE
                                user_id =
                                    :user_id
                        '
                    );

                $delete->execute([
                    'user_id' =>
                        $userId,
                ]);

                foreach ($roles as $roleName) {
                    $roleStatement =
                        $this->pdo->prepare(
                            '
                                SELECT role_id

                                FROM roles

                                WHERE
                                    role_name =
                                        :role_name

                                LIMIT 1
                            '
                        );

                    $roleStatement->execute([
                        'role_name' =>
                            $roleName,
                    ]);

                    $roleId =
                        $roleStatement
                            ->fetchColumn();

                    if ($roleId === false) {
                        continue;
                    }

                    $insert =
                        $this->pdo->prepare(
                            '
                                INSERT INTO user_roles (
                                    user_id,
                                    role_id
                                )
                                VALUES (
                                    :user_id,
                                    :role_id
                                )
                            '
                        );

                    $insert->execute([
                        'user_id' =>
                            $userId,

                        'role_id' =>
                            (int) $roleId,
                    ]);
                }
            }

            $this->pdo->commit();
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

    public function archiveUser(
        int $userId
    ): void {
        $statement =
            $this->pdo->prepare(
                '
                    UPDATE users

                    SET status =
                        \'inactive\'

                    WHERE
                        user_id =
                            :user_id
                '
            );

        $statement->execute([
            'user_id' =>
                $userId,
        ]);

        if (
            $statement->rowCount()
            === 0
        ) {
            $existing =
                $this->findUserById(
                    $userId
                );

            if ($existing === null) {
                throw new OutOfBoundsException(
                    'User not found.'
                );
            }
        }
    }

    public function listOrders(
        int $page,
        int $perPage,
        ?string $search,
        ?string $status
    ): array {
        $offset =
            ($page - 1) * $perPage;

        $where = [];
        $parameters = [];

        if (
            $search !== null
            && $search !== ''
        ) {
            $where[] = '
                (
                    o.order_number LIKE
                        :search_order

                    OR u.email LIKE
                        :search_email

                    OR u.first_name LIKE
                        :search_first

                    OR u.last_name LIKE
                        :search_last
                )
            ';

            $value =
                '%' . $search . '%';

            $parameters[
                'search_order'
            ] = $value;

            $parameters[
                'search_email'
            ] = $value;

            $parameters[
                'search_first'
            ] = $value;

            $parameters[
                'search_last'
            ] = $value;
        }

        if ($status !== null) {
            $where[] =
                'o.order_status = :status';

            $parameters['status'] =
                $status;
        }

        $whereSql =
            $where === []
                ? ''
                : 'WHERE '
                    . implode(
                        ' AND ',
                        $where
                    );

        $count =
            $this->pdo->prepare(
                '
                    SELECT COUNT(*)

                    FROM orders o

                    INNER JOIN users u
                        ON u.user_id =
                            o.user_id

                    ' . $whereSql
            );

        $count->execute(
            $parameters
        );

        $total =
            (int) $count
                ->fetchColumn();

        $statement =
            $this->pdo->prepare(
                '
                    SELECT
                        o.order_id,
                        o.order_number,
                        o.user_id,
                        o.subtotal,
                        o.vat_amount,
                        o.shipping_amount,
                        o.total_amount,
                        o.order_status,
                        o.created_at,

                        u.first_name,
                        u.last_name,
                        u.email,

                        ofl.fulfillment_method,
                        ofl.delivery_method,
                        ofl.fulfillment_status,

                        (
                            SELECT
                                p.payment_status

                            FROM payments p

                            WHERE
                                p.order_id =
                                    o.order_id

                            ORDER BY
                                p.payment_id DESC

                            LIMIT 1
                        ) AS payment_status

                    FROM orders o

                    INNER JOIN users u
                        ON u.user_id =
                            o.user_id

                    LEFT JOIN
                        order_fulfillments ofl
                        ON ofl.order_id =
                            o.order_id

                    ' . $whereSql . '

                    ORDER BY
                        o.created_at DESC,
                        o.order_id DESC

                    LIMIT ' . (int) $perPage . '
                    OFFSET ' . (int) $offset
            );

        $statement->execute(
            $parameters
        );

        return [
            'rows' =>
                $statement->fetchAll(),

            'total' =>
                $total,
        ];
    }

    public function findOrderByNumber(
        string $orderNumber
    ): ?array {
        $statement =
            $this->pdo->prepare(
                '
                    SELECT
                        o.order_id,
                        o.order_number,
                        o.user_id,
                        o.subtotal,
                        o.vat_amount,
                        o.shipping_amount,
                        o.total_amount,
                        o.order_status,
                        o.created_at,
                        o.updated_at,

                        u.first_name,
                        u.last_name,
                        u.email,
                        u.phone,

                        oa.recipient_name,
                        oa.contact_number,
                        oa.address_line_1,
                        oa.address_line_2,
                        oa.city,
                        oa.province,
                        oa.postal_code,
                        oa.country,

                        ofl.fulfillment_method,
                        ofl.delivery_method,
                        ofl.delivery_fee,
                        ofl.calculated_distance_km,
                        ofl.fulfillment_status,
                        ofl.collection_name,
                        ofl.collection_contact_number,
                        ofl.collection_address_line_1,
                        ofl.collection_address_line_2,
                        ofl.collection_city,
                        ofl.collection_province,
                        ofl.collection_postal_code,
                        ofl.collection_country

                    FROM orders o

                    INNER JOIN users u
                        ON u.user_id =
                            o.user_id

                    LEFT JOIN order_addresses oa
                        ON oa.order_id =
                            o.order_id

                    LEFT JOIN order_fulfillments ofl
                        ON ofl.order_id =
                            o.order_id

                    WHERE
                        o.order_number =
                            :order_number

                    LIMIT 1
                '
            );

        $statement->execute([
            'order_number' =>
                $orderNumber,
        ]);

        $order =
            $statement->fetch();

        if ($order === false) {
            return null;
        }

        $orderId =
            (int) $order[
                'order_id'
            ];

        $items =
            $this->pdo->prepare(
                '
                    SELECT
                        oi.order_item_id,
                        oi.vendor_order_id,
                        oi.variant_id,
                        oi.product_name,
                        oi.variant_name,
                        oi.sku,
                        oi.quantity,
                        oi.unit_price,
                        oi.line_total,
                        oi.commission_percentage,
                        oi.commission_amount,
                        oi.vendor_net_amount

                    FROM order_items oi

                    WHERE
                        oi.order_id =
                            :order_id

                    ORDER BY
                        oi.order_item_id
                '
            );

        $items->execute([
            'order_id' =>
                $orderId,
        ]);

        $vendorOrders =
            $this->pdo->prepare(
                '
                    SELECT
                        vo.vendor_order_id,
                        vo.vendor_id,
                        vo.vendor_order_number,
                        vo.items_subtotal,
                        vo.commission_total,
                        vo.vendor_net_total,
                        vo.vendor_order_status,

                        v.institution_company_name
                            AS vendor_name

                    FROM vendor_orders vo

                    INNER JOIN vendors v
                        ON v.vendor_id =
                            vo.vendor_id

                    WHERE
                        vo.order_id =
                            :order_id

                    ORDER BY
                        vo.vendor_order_id
                '
            );

        $vendorOrders->execute([
            'order_id' =>
                $orderId,
        ]);

        $payments =
            $this->pdo->prepare(
                '
                    SELECT
                        payment_id,
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
                        order_id =
                            :order_id

                    ORDER BY
                        payment_id
                '
            );

        $payments->execute([
            'order_id' =>
                $orderId,
        ]);

        $refunds =
            $this->pdo->prepare(
                '
                    SELECT
                        refund_id,
                        payment_id,
                        refund_reference,
                        refund_amount,
                        refund_reason,
                        refund_status,
                        requested_by,
                        approved_by,
                        requested_at,
                        approved_at,
                        processed_at

                    FROM refunds

                    WHERE
                        order_id =
                            :order_id

                    ORDER BY
                        refund_id
                '
            );

        $refunds->execute([
            'order_id' =>
                $orderId,
        ]);

        $shipments =
            $this->pdo->prepare(
                '
                    SELECT
                        shipment_id,
                        vendor_order_id,
                        courier_provider,
                        provider_shipment_reference,
                        tracking_reference,
                        shipment_status,
                        shipped_at,
                        delivered_at,
                        created_at,
                        updated_at

                    FROM shipments

                    WHERE
                        order_id =
                            :order_id

                    ORDER BY
                        shipment_id
                '
            );

        $shipments->execute([
            'order_id' =>
                $orderId,
        ]);

        return [
            'order' =>
                $order,

            'items' =>
                $items->fetchAll(),

            'vendor_orders' =>
                $vendorOrders->fetchAll(),

            'payments' =>
                $payments->fetchAll(),

            'refunds' =>
                $refunds->fetchAll(),

            'shipments' =>
                $shipments->fetchAll(),
        ];
    }

    public function findRefundableDemoPayment(
        string $orderNumber
    ): ?int {
        $statement =
            $this->pdo->prepare(
                '
                    SELECT
                        p.payment_id

                    FROM payments p

                    INNER JOIN orders o
                        ON o.order_id =
                            p.order_id

                    WHERE
                        o.order_number =
                            :order_number

                        AND p.payment_gateway =
                            \'Demo\'

                        AND p.payment_status =
                            \'successful\'

                    ORDER BY
                        p.payment_id DESC

                    LIMIT 1
                '
            );

        $statement->execute([
            'order_number' =>
                $orderNumber,
        ]);

        $paymentId =
            $statement->fetchColumn();

        return $paymentId === false
            ? null
            : (int) $paymentId;
    }

    public function listCommissionRules():
        array
    {
        $statement =
            $this->pdo->query(
                '
                    SELECT
                        cr.commission_rule_id,
                        cr.category_id,
                        cr.product_id,
                        cr.commission_percentage,
                        cr.status,
                        cr.created_by,
                        cr.created_at,
                        cr.updated_at,

                        c.category_name,
                        p.product_name

                    FROM commission_rules cr

                    LEFT JOIN categories c
                        ON c.category_id =
                            cr.category_id

                    LEFT JOIN products p
                        ON p.product_id =
                            cr.product_id

                    ORDER BY
                        cr.commission_rule_id
                '
            );

        return $statement->fetchAll();
    }

    public function categoryExists(
        int $categoryId
    ): bool {
        $statement =
            $this->pdo->prepare(
                '
                    SELECT category_id

                    FROM categories

                    WHERE
                        category_id =
                            :category_id

                    LIMIT 1
                '
            );

        $statement->execute([
            'category_id' =>
                $categoryId,
        ]);

        return
            $statement->fetchColumn()
            !== false;
    }

    public function productExists(
        int $productId
    ): bool {
        $statement =
            $this->pdo->prepare(
                '
                    SELECT product_id

                    FROM products

                    WHERE
                        product_id =
                            :product_id

                    LIMIT 1
                '
            );

        $statement->execute([
            'product_id' =>
                $productId,
        ]);

        return
            $statement->fetchColumn()
            !== false;
    }

    public function upsertCommissionRule(
        ?int $categoryId,
        ?int $productId,
        float $percentage,
        string $status,
        int $adminUserId
    ): void {
        if ($categoryId !== null) {
            $statement =
                $this->pdo->prepare(
                    '
                        INSERT INTO commission_rules (
                            category_id,
                            product_id,
                            commission_percentage,
                            status,
                            created_by
                        )
                        VALUES (
                            :category_id,
                            NULL,
                            :commission_percentage,
                            :status,
                            :created_by
                        )

                        ON DUPLICATE KEY UPDATE
                            commission_percentage =
                                VALUES(
                                    commission_percentage
                                ),

                            status =
                                VALUES(status),

                            created_by =
                                VALUES(created_by),

                            updated_at =
                                CURRENT_TIMESTAMP
                    '
                );

            $statement->execute([
                'category_id' =>
                    $categoryId,

                'commission_percentage' =>
                    $percentage,

                'status' =>
                    $status,

                'created_by' =>
                    $adminUserId,
            ]);

            return;
        }

        $statement =
            $this->pdo->prepare(
                '
                    INSERT INTO commission_rules (
                        category_id,
                        product_id,
                        commission_percentage,
                        status,
                        created_by
                    )
                    VALUES (
                        NULL,
                        :product_id,
                        :commission_percentage,
                        :status,
                        :created_by
                    )

                    ON DUPLICATE KEY UPDATE
                        commission_percentage =
                            VALUES(
                                commission_percentage
                            ),

                        status =
                            VALUES(status),

                        created_by =
                            VALUES(created_by),

                        updated_at =
                            CURRENT_TIMESTAMP
                '
            );

        $statement->execute([
            'product_id' =>
                $productId,

            'commission_percentage' =>
                $percentage,

            'status' =>
                $status,

            'created_by' =>
                $adminUserId,
        ]);
    }

    public function listDeliveryRates(): array
    {
        $statement =
            $this->pdo->query(
                '
                    SELECT
                        delivery_rate_id,
                        delivery_method,
                        min_distance_km,
                        max_distance_km,
                        price,
                        status,
                        created_by,
                        created_at,
                        updated_at

                    FROM delivery_rate_brackets

                    ORDER BY
                        delivery_method,
                        min_distance_km,
                        delivery_rate_id
                '
            );

        return $statement->fetchAll();
    }

    public function findDeliveryRate(
        int $deliveryRateId
    ): ?array {
        $statement =
            $this->pdo->prepare(
                '
                    SELECT
                        delivery_rate_id,
                        delivery_method,
                        min_distance_km,
                        max_distance_km,
                        price,
                        status,
                        created_by,
                        created_at,
                        updated_at

                    FROM delivery_rate_brackets

                    WHERE
                        delivery_rate_id =
                            :delivery_rate_id

                    LIMIT 1
                '
            );

        $statement->execute([
            'delivery_rate_id' =>
                $deliveryRateId,
        ]);

        $rate =
            $statement->fetch();

        return $rate === false
            ? null
            : $rate;
    }

    public function hasDeliveryOverlap(
        string $method,
        float $minDistance,
        ?float $maxDistance,
        ?int $excludeId = null
    ): bool {
        $sql = '
            SELECT delivery_rate_id

            FROM delivery_rate_brackets

            WHERE
                delivery_method =
                    :delivery_method

                AND status =
                    \'active\'

                AND (
                    max_distance_km IS NULL
                    OR max_distance_km >=
                        :min_distance
                )
        ';

        $parameters = [
            'delivery_method' =>
                $method,

            'min_distance' =>
                $minDistance,
        ];

        if ($maxDistance !== null) {
            $sql .= '
                AND min_distance_km <=
                    :max_distance
            ';

            $parameters[
                'max_distance'
            ] =
                $maxDistance;
        }

        if ($excludeId !== null) {
            $sql .= '
                AND delivery_rate_id <>
                    :exclude_id
            ';

            $parameters[
                'exclude_id'
            ] =
                $excludeId;
        }

        $sql .= ' LIMIT 1';

        $statement =
            $this->pdo->prepare(
                $sql
            );

        $statement->execute(
            $parameters
        );

        return
            $statement->fetchColumn()
            !== false;
    }

    public function createDeliveryRate(
        string $method,
        float $minDistance,
        ?float $maxDistance,
        float $price,
        string $status,
        int $adminUserId
    ): int {
        $statement =
            $this->pdo->prepare(
                '
                    INSERT INTO
                        delivery_rate_brackets (
                            delivery_method,
                            min_distance_km,
                            max_distance_km,
                            price,
                            status,
                            created_by
                        )
                    VALUES (
                        :delivery_method,
                        :min_distance_km,
                        :max_distance_km,
                        :price,
                        :status,
                        :created_by
                    )
                '
            );

        $statement->execute([
            'delivery_method' =>
                $method,

            'min_distance_km' =>
                $minDistance,

            'max_distance_km' =>
                $maxDistance,

            'price' =>
                $price,

            'status' =>
                $status,

            'created_by' =>
                $adminUserId,
        ]);

        return
            (int) $this->pdo
                ->lastInsertId();
    }

    public function updateDeliveryRate(
        int $deliveryRateId,
        string $method,
        float $minDistance,
        ?float $maxDistance,
        float $price,
        string $status,
        int $adminUserId
    ): void {
        $statement =
            $this->pdo->prepare(
                '
                    UPDATE delivery_rate_brackets

                    SET
                        delivery_method =
                            :delivery_method,

                        min_distance_km =
                            :min_distance_km,

                        max_distance_km =
                            :max_distance_km,

                        price =
                            :price,

                        status =
                            :status,

                        created_by =
                            :created_by,

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        delivery_rate_id =
                            :delivery_rate_id
                '
            );

        $statement->execute([
            'delivery_method' =>
                $method,

            'min_distance_km' =>
                $minDistance,

            'max_distance_km' =>
                $maxDistance,

            'price' =>
                $price,

            'status' =>
                $status,

            'created_by' =>
                $adminUserId,

            'delivery_rate_id' =>
                $deliveryRateId,
        ]);
    }

    public function archiveDeliveryRate(
        int $deliveryRateId
    ): void {
        $statement =
            $this->pdo->prepare(
                '
                    UPDATE delivery_rate_brackets

                    SET
                        status =
                            \'inactive\',

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE
                        delivery_rate_id =
                            :delivery_rate_id
                '
            );

        $statement->execute([
            'delivery_rate_id' =>
                $deliveryRateId,
        ]);
    }

    public function findActiveCollectionLocation():
        ?array
    {
        $statement =
            $this->pdo->query(
                '
                    SELECT
                        collection_location_id,
                        location_name,
                        contact_number,
                        address_line_1,
                        address_line_2,
                        city,
                        province,
                        postal_code,
                        country,
                        status,
                        updated_by,
                        created_at,
                        updated_at

                    FROM collection_locations

                    WHERE
                        status =
                            \'active\'

                    ORDER BY
                        collection_location_id

                    LIMIT 1
                '
            );

        $location =
            $statement->fetch();

        return $location === false
            ? null
            : $location;
    }

    public function saveCollectionLocation(
        array $location,
        int $adminUserId
    ): int {
        $this->pdo->beginTransaction();

        try {
            $current =
                $this
                    ->findActiveCollectionLocation();

            if ($current === null) {
                $deactivate =
                    $this->pdo->prepare(
                        '
                            UPDATE collection_locations

                            SET status =
                                \'inactive\'

                            WHERE
                                status =
                                    \'active\'
                        '
                    );

                $deactivate->execute();

                $insert =
                    $this->pdo->prepare(
                        '
                            INSERT INTO
                                collection_locations (
                                    location_name,
                                    contact_number,
                                    address_line_1,
                                    address_line_2,
                                    city,
                                    province,
                                    postal_code,
                                    country,
                                    status,
                                    updated_by
                                )
                            VALUES (
                                :location_name,
                                :contact_number,
                                :address_line_1,
                                :address_line_2,
                                :city,
                                :province,
                                :postal_code,
                                :country,
                                \'active\',
                                :updated_by
                            )
                        '
                    );

                $insert->execute([
                    'location_name' =>
                        $location[
                            'location_name'
                        ],

                    'contact_number' =>
                        $location[
                            'contact_number'
                        ],

                    'address_line_1' =>
                        $location[
                            'address_line_1'
                        ],

                    'address_line_2' =>
                        $location[
                            'address_line_2'
                        ],

                    'city' =>
                        $location['city'],

                    'province' =>
                        $location[
                            'province'
                        ],

                    'postal_code' =>
                        $location[
                            'postal_code'
                        ],

                    'country' =>
                        $location[
                            'country'
                        ],

                    'updated_by' =>
                        $adminUserId,
                ]);

                $locationId =
                    (int) $this->pdo
                        ->lastInsertId();
            } else {
                $locationId =
                    (int) $current[
                        'collection_location_id'
                    ];

                $update =
                    $this->pdo->prepare(
                        '
                            UPDATE collection_locations

                            SET
                                location_name =
                                    :location_name,

                                contact_number =
                                    :contact_number,

                                address_line_1 =
                                    :address_line_1,

                                address_line_2 =
                                    :address_line_2,

                                city =
                                    :city,

                                province =
                                    :province,

                                postal_code =
                                    :postal_code,

                                country =
                                    :country,

                                status =
                                    \'active\',

                                updated_by =
                                    :updated_by,

                                updated_at =
                                    CURRENT_TIMESTAMP

                            WHERE
                                collection_location_id =
                                    :location_id
                        '
                    );

                $update->execute([
                    'location_name' =>
                        $location[
                            'location_name'
                        ],

                    'contact_number' =>
                        $location[
                            'contact_number'
                        ],

                    'address_line_1' =>
                        $location[
                            'address_line_1'
                        ],

                    'address_line_2' =>
                        $location[
                            'address_line_2'
                        ],

                    'city' =>
                        $location['city'],

                    'province' =>
                        $location[
                            'province'
                        ],

                    'postal_code' =>
                        $location[
                            'postal_code'
                        ],

                    'country' =>
                        $location[
                            'country'
                        ],

                    'updated_by' =>
                        $adminUserId,

                    'location_id' =>
                        $locationId,
                ]);

                $deactivateOthers =
                    $this->pdo->prepare(
                        '
                            UPDATE collection_locations

                            SET status =
                                \'inactive\'

                            WHERE
                                collection_location_id <>
                                    :location_id

                                AND status =
                                    \'active\'
                        '
                    );

                $deactivateOthers->execute([
                    'location_id' =>
                        $locationId,
                ]);
            }

            $this->pdo->commit();

            return $locationId;
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