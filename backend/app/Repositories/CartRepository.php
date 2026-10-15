<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;
use RuntimeException;
use Throwable;

final class CartRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function findActiveCartByUserId(
        int $userId
    ): ?array {
        $this->expireActiveCartByUserId(
            $userId
        );

        $statement = $this->pdo->prepare(
            '
            SELECT
                cart_id,
                user_id,
                cart_status,
                created_at,
                updated_at
            FROM carts
            WHERE
                user_id = :user_id
                AND cart_status = \'active\'
            ORDER BY cart_id DESC
            LIMIT 1
            '
        );

        $statement->execute([
            'user_id' => $userId,
        ]);

        $cart = $statement->fetch();

        return $cart === false
            ? null
            : $cart;
    }

    public function expireActiveCartByUserId(
        int $userId
    ): bool {
        $statement = $this->pdo->prepare(
            '
            UPDATE carts
            SET cart_status = \'abandoned\'
            WHERE
                user_id = :user_id
                AND cart_status = \'active\'
                AND created_at <=
                    DATE_SUB(
                        CURRENT_TIMESTAMP,
                        INTERVAL 7 DAY
                    )
            '
        );

        $statement->execute([
            'user_id' => $userId,
        ]);

        return $statement->rowCount() > 0;
    }

    public function expireAllActiveCarts(): int
    {
        $statement = $this->pdo->prepare(
            '
            UPDATE carts
            SET cart_status = \'abandoned\'
            WHERE
                cart_status = \'active\'
                AND created_at <=
                    DATE_SUB(
                        CURRENT_TIMESTAMP,
                        INTERVAL 7 DAY
                    )
            '
        );

        $statement->execute();

        return $statement->rowCount();
    }

    public function getOrCreateActiveCartId(
        int $userId
    ): int {
        $this->pdo->beginTransaction();

        try {
            /*
             * Lock the user row so two simultaneous requests
             * cannot create two active carts for the same user.
             */
            $userStatement = $this->pdo->prepare(
                '
                SELECT user_id
                FROM users
                WHERE user_id = :user_id
                FOR UPDATE
                '
            );

            $userStatement->execute([
                'user_id' => $userId,
            ]);

            if ($userStatement->fetch() === false) {
                throw new RuntimeException(
                    'User not found.'
                );
            }

            /*
             * Expire any existing cart that has reached
             * the fixed seven-day lifetime before looking
             * for a usable active cart.
             */
            $this->expireActiveCartByUserId(
                $userId
            );

            $cartStatement = $this->pdo->prepare(
                '
                SELECT cart_id
                FROM carts
                WHERE
                    user_id = :user_id
                    AND cart_status = \'active\'
                ORDER BY cart_id DESC
                LIMIT 1
                '
            );

            $cartStatement->execute([
                'user_id' => $userId,
            ]);

            $cartId = $cartStatement->fetchColumn();

            if ($cartId !== false) {
                $this->pdo->commit();

                return (int) $cartId;
            }

            $insert = $this->pdo->prepare(
                '
                INSERT INTO carts (
                    user_id,
                    cart_status
                )
                VALUES (
                    :user_id,
                    \'active\'
                )
                '
            );

            $insert->execute([
                'user_id' => $userId,
            ]);

            $cartId =
                (int) $this->pdo->lastInsertId();

            $this->pdo->commit();

            return $cartId;
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    public function findVariant(
        int $variantId
    ): ?array {
        $statement = $this->pdo->prepare(
            '
            SELECT
                pv.variant_id,
                pv.product_id,
                pv.variant_name,
                pv.sku,
                pv.model_number,
                pv.unit,
                pv.selling_price,
                pv.variant_status,

                p.product_name,
                p.slug,
                p.product_status,
                p.approval_status,

                v.vendor_status,

                COALESCE(
                    i.quantity_in_stock,
                    0
                ) AS quantity_in_stock

            FROM product_variants pv

            INNER JOIN products p
                ON p.product_id = pv.product_id

            INNER JOIN vendors v
                ON v.vendor_id = p.vendor_id

            LEFT JOIN inventory i
                ON i.variant_id = pv.variant_id

            WHERE pv.variant_id = :variant_id

            LIMIT 1
            '
        );

        $statement->execute([
            'variant_id' => $variantId,
        ]);

        $variant = $statement->fetch();

        return $variant === false
            ? null
            : $variant;
    }

    public function findCartItemByVariant(
        int $cartId,
        int $variantId
    ): ?array {
        $statement = $this->pdo->prepare(
            '
            SELECT
                cart_item_id,
                cart_id,
                variant_id,
                quantity,
                added_at,
                updated_at

            FROM cart_items

            WHERE
                cart_id = :cart_id
                AND variant_id = :variant_id

            LIMIT 1
            '
        );

        $statement->execute([
            'cart_id' => $cartId,
            'variant_id' => $variantId,
        ]);

        $item = $statement->fetch();

        return $item === false
            ? null
            : $item;
    }

    public function setCartItemQuantity(
        int $cartId,
        int $variantId,
        int $quantity
    ): void {
        $statement = $this->pdo->prepare(
            '
            INSERT INTO cart_items (
                cart_id,
                variant_id,
                quantity
            )
            VALUES (
                :cart_id,
                :variant_id,
                :quantity
            )

            ON DUPLICATE KEY UPDATE
                quantity = VALUES(quantity),
                updated_at = CURRENT_TIMESTAMP
            '
        );

        $statement->execute([
            'cart_id' => $cartId,
            'variant_id' => $variantId,
            'quantity' => $quantity,
        ]);
    }

    public function findOwnedCartItem(
        int $userId,
        int $cartItemId
    ): ?array {
        /*
         * Prevent items belonging to an expired cart from
         * being updated or removed before expiration runs.
         */
        $this->expireActiveCartByUserId(
            $userId
        );

        $statement = $this->pdo->prepare(
            '
            SELECT
                ci.cart_item_id,
                ci.cart_id,
                ci.variant_id,
                ci.quantity

            FROM cart_items ci

            INNER JOIN carts c
                ON c.cart_id = ci.cart_id

            WHERE
                ci.cart_item_id = :cart_item_id
                AND c.user_id = :user_id
                AND c.cart_status = \'active\'

            LIMIT 1
            '
        );

        $statement->execute([
            'cart_item_id' => $cartItemId,
            'user_id' => $userId,
        ]);

        $item = $statement->fetch();

        return $item === false
            ? null
            : $item;
    }

    public function updateCartItemQuantity(
        int $cartItemId,
        int $quantity
    ): void {
        $statement = $this->pdo->prepare(
            '
            UPDATE cart_items
            SET
                quantity = :quantity,
                updated_at = CURRENT_TIMESTAMP
            WHERE cart_item_id = :cart_item_id
            '
        );

        $statement->execute([
            'quantity' => $quantity,
            'cart_item_id' => $cartItemId,
        ]);
    }

    public function deleteCartItem(
        int $cartItemId
    ): void {
        $statement = $this->pdo->prepare(
            '
            DELETE FROM cart_items
            WHERE cart_item_id = :cart_item_id
            '
        );

        $statement->execute([
            'cart_item_id' => $cartItemId,
        ]);
    }

    public function deleteAllCartItems(
        int $cartId
    ): void {
        $statement = $this->pdo->prepare(
            '
            DELETE FROM cart_items
            WHERE cart_id = :cart_id
            '
        );

        $statement->execute([
            'cart_id' => $cartId,
        ]);
    }

    public function findItemsByCartId(
        int $cartId
    ): array {
        $statement = $this->pdo->prepare(
            '
            SELECT
                ci.cart_item_id,
                ci.quantity,

                pv.variant_id,
                pv.variant_name,
                pv.sku,
                pv.model_number,
                pv.unit,
                pv.selling_price,
                pv.variant_status,

                p.product_id,
                p.product_name,
                p.slug,
                p.product_status,
                p.approval_status,

                v.vendor_status,

                COALESCE(
                    i.quantity_in_stock,
                    0
                ) AS quantity_in_stock,

                (
                    SELECT pi.image_url
                    FROM product_images pi
                    WHERE
                        pi.product_id = p.product_id
                    ORDER BY
                        pi.is_primary DESC,
                        pi.sort_order ASC,
                        pi.image_id ASC
                    LIMIT 1
                ) AS primary_image

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

            ORDER BY ci.added_at ASC
            '
        );

        $statement->execute([
            'cart_id' => $cartId,
        ]);

        return $statement->fetchAll();
    }
}