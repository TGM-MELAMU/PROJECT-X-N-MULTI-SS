<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;

final class CheckoutService
{
    private const VAT_RATE = 15.0;

    private CartService $cart;

    public function __construct(
        ?CartService $cart = null
    ) {
        $this->cart =
            $cart ?? new CartService();
    }

    public function getSummary(
        int $userId,
        bool $emailVerified
    ): array {
        if (!$emailVerified) {
            throw new DomainException(
                'Email verification is required before checkout.'
            );
        }

        $cart =
            $this->cart->getCart(
                $userId,
                true
            );

        if (empty($cart['items'])) {
            throw new DomainException(
                'Your cart is empty.'
            );
        }

        $subtotal =
            round(
                (float) (
                    $cart['summary']['subtotal']
                    ?? 0
                ),
                2
            );

        /*
         * MultiSS selling prices are VAT-inclusive.
         *
         * VAT portion of a VAT-inclusive amount:
         * total × 15 / 115
         */
        $vatAmount =
            round(
                $subtotal
                * self::VAT_RATE
                / (100 + self::VAT_RATE),
                2
            );

        /*
         * Phase 4 delivery placeholder.
         * A real delivery calculation can replace this later.
         */
        $shippingAmount = 0.00;

        $grandTotal =
            round(
                $subtotal + $shippingAmount,
                2
            );

        return [
            'cart' => $cart,

            'totals' => [
                'subtotal' =>
                    $subtotal,

                'vat_rate' =>
                    self::VAT_RATE,

                'vat_amount' =>
                    $vatAmount,

                'shipping_amount' =>
                    $shippingAmount,

                'grand_total' =>
                    $grandTotal,

                'prices_include_vat' =>
                    true,
            ],

            'delivery' => [
                'method' =>
                    'placeholder',

                'amount' =>
                    $shippingAmount,

                'message' =>
                    'Delivery cost is currently set to R0.00 and will be replaced by the final delivery calculation.',
            ],
        ];
    }
}