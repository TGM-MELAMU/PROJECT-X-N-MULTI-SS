<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Repositories\CartRepository;
use OutOfBoundsException;

final class CartService
{
    private const LOW_STOCK_THRESHOLD = 5;

    private const CART_EXPIRATION_NOTICE =
        'Items in your cart will expire after 7 days.';

    private CartRepository $carts;

    public function __construct(
        ?CartRepository $carts = null
    ) {
        $this->carts =
            $carts ?? new CartRepository();
    }

    public function getCart(
        int $userId,
        bool $canViewPrices
    ): array {
        $cart =
            $this->carts
                ->findActiveCartByUserId(
                    $userId
                );

        if ($cart === null) {
            return $this->formatCart(
                null,
                [],
                $canViewPrices
            );
        }

        $items =
            $this->carts
                ->findItemsByCartId(
                    (int) $cart['cart_id']
                );

        return $this->formatCart(
            $cart,
            $items,
            $canViewPrices
        );
    }

    public function addItem(
        int $userId,
        array $data,
        bool $canViewPrices
    ): array {
        $variantId =
            $this->positiveInt(
                $data['variant_id'] ?? null,
                'Variant ID'
            );

        $quantity =
            $this->positiveInt(
                $data['quantity'] ?? 1,
                'Quantity'
            );

        $variant =
            $this->carts->findVariant(
                $variantId
            );

        $this->assertPurchasable(
            $variant,
            $quantity
        );

        $cartId =
            $this->carts
                ->getOrCreateActiveCartId(
                    $userId
                );

        $existing =
            $this->carts
                ->findCartItemByVariant(
                    $cartId,
                    $variantId
                );

        $newQuantity =
            $quantity +
            (int) ($existing['quantity'] ?? 0);

        $this->assertPurchasable(
            $variant,
            $newQuantity
        );

        $this->carts
            ->setCartItemQuantity(
                $cartId,
                $variantId,
                $newQuantity
            );

        return $this->getCart(
            $userId,
            $canViewPrices
        );
    }

    public function updateItem(
        int $userId,
        int $cartItemId,
        array $data,
        bool $canViewPrices
    ): array {
        if ($cartItemId <= 0) {
            throw new InvalidArgumentException(
                'Invalid cart item ID.'
            );
        }

        $quantity =
            $this->positiveInt(
                $data['quantity'] ?? null,
                'Quantity'
            );

        $item =
            $this->carts
                ->findOwnedCartItem(
                    $userId,
                    $cartItemId
                );

        if ($item === null) {
            throw new OutOfBoundsException(
                'Cart item not found.'
            );
        }

        $variant =
            $this->carts->findVariant(
                (int) $item['variant_id']
            );

        $this->assertPurchasable(
            $variant,
            $quantity
        );

        $this->carts
            ->updateCartItemQuantity(
                $cartItemId,
                $quantity
            );

        return $this->getCart(
            $userId,
            $canViewPrices
        );
    }

    public function removeItem(
        int $userId,
        int $cartItemId,
        bool $canViewPrices
    ): array {
        if ($cartItemId <= 0) {
            throw new InvalidArgumentException(
                'Invalid cart item ID.'
            );
        }

        $item =
            $this->carts
                ->findOwnedCartItem(
                    $userId,
                    $cartItemId
                );

        if ($item === null) {
            throw new OutOfBoundsException(
                'Cart item not found.'
            );
        }

        $this->carts->deleteCartItem(
            $cartItemId
        );

        return $this->getCart(
            $userId,
            $canViewPrices
        );
    }

    public function clearCart(
        int $userId,
        bool $canViewPrices
    ): array {
        $cart =
            $this->carts
                ->findActiveCartByUserId(
                    $userId
                );

        if ($cart === null) {
            return $this->getCart(
                $userId,
                $canViewPrices
            );
        }

        $this->carts->deleteAllCartItems(
            (int) $cart['cart_id']
        );

        return $this->getCart(
            $userId,
            $canViewPrices
        );
    }

    private function assertPurchasable(
        ?array $variant,
        int $quantity
    ): void {
        if ($variant === null) {
            throw new OutOfBoundsException(
                'Product variant not found.'
            );
        }

        if (
            $variant['variant_status'] !== 'active'
            || $variant['product_status'] !== 'active'
            || $variant['approval_status'] !== 'approved'
            || $variant['vendor_status'] !== 'active'
        ) {
            throw new DomainException(
                'This product is not currently available.'
            );
        }

        $stock =
            (int) $variant['quantity_in_stock'];

        /*
         * Existing MultiSS business rule:
         * stock > 5  = In Stock
         * stock <= 5 = Out of Stock
         */
        if (
            $stock <= self::LOW_STOCK_THRESHOLD
        ) {
            throw new DomainException(
                'This product is currently out of stock.'
            );
        }

        if ($quantity > $stock) {
            throw new DomainException(
                'Requested quantity exceeds available stock.'
            );
        }
    }

    private function formatCart(
        ?array $cart,
        array $rows,
        bool $canViewPrices
    ): array {
        $items = [];

        $totalQuantity = 0;
        $subtotal = 0.0;

        foreach ($rows as $row) {
            $quantity =
                (int) $row['quantity'];

            $available =
                $row['variant_status'] === 'active'
                && $row['product_status'] === 'active'
                && $row['approval_status'] === 'approved'
                && $row['vendor_status'] === 'active'
                && (int) $row['quantity_in_stock']
                    > self::LOW_STOCK_THRESHOLD;

            $item = [
                'cart_item_id' =>
                    (int) $row['cart_item_id'],

                'product_id' =>
                    (int) $row['product_id'],

                'product_name' =>
                    $row['product_name'],

                'slug' =>
                    $row['slug'],

                'primary_image' =>
                    $row['primary_image'],

                'variant_id' =>
                    (int) $row['variant_id'],

                'variant_name' =>
                    $row['variant_name'],

                'sku' =>
                    $row['sku'],

                'model_number' =>
                    $row['model_number'],

                'unit' =>
                    $row['unit'],

                'quantity' =>
                    $quantity,

                'availability' =>
                    $available
                        ? 'In Stock'
                        : 'Out of Stock',
            ];

            if ($canViewPrices) {
                $unitPrice =
                    round(
                        (float) $row['selling_price'],
                        2
                    );

                $lineTotal =
                    round(
                        $unitPrice * $quantity,
                        2
                    );

                $item['unit_price'] =
                    $unitPrice;

                $item['line_total'] =
                    $lineTotal;

                $subtotal += $lineTotal;
            }

            $items[] = $item;

            $totalQuantity +=
                $quantity;
        }

        $summary = [
            'item_count' =>
                count($items),

            'total_quantity' =>
                $totalQuantity,

            'prices_visible' =>
                $canViewPrices,
        ];

        if ($canViewPrices) {
            $summary['subtotal'] =
                round($subtotal, 2);
        }

        return [
            'cart_id' =>
                $cart === null
                    ? null
                    : (int) $cart['cart_id'],

            'status' =>
                $cart['cart_status']
                    ?? 'active',

            'expiration_notice' =>
                self::CART_EXPIRATION_NOTICE,

            'items' =>
                $items,

            'summary' =>
                $summary,
        ];
    }

    private function positiveInt(
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
                $field .
                ' must be a positive integer.'
            );
        }

        return (int) $validated;
    }
}