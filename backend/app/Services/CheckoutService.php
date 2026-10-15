<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;

final class CheckoutService
{
    private const VAT_RATE = 15.0;

    private CartService $cart;

    private DeliveryService $delivery;

    public function __construct(
        ?CartService $cart = null,
        ?DeliveryService $delivery = null
    ) {
        $this->cart =
            $cart ?? new CartService();

        $this->delivery =
            $delivery ?? new DeliveryService();
    }

    public function getSummary(
        int $userId,
        bool $emailVerified
    ): array {
        $cart =
            $this->validatedCart(
                $userId,
                $emailVerified
            );

        $totals =
            $this->baseTotals(
                $cart,
                0.00
            );

        return [
            'cart' => $cart,

            'totals' => $totals,

            'fulfillment' => [
                'quote_required' => true,

                'options' =>
                    $this->delivery
                        ->options(),
            ],
        ];
    }

    public function quote(
        int $userId,
        bool $emailVerified,
        array $data
    ): array {
        $cart =
            $this->validatedCart(
                $userId,
                $emailVerified
            );

        $deliveryQuote =
            $this->delivery
                ->quote(
                    $userId,
                    $data
                );

        $totals =
            $this->baseTotals(
                $cart,
                (float) $deliveryQuote[
                    'delivery_fee'
                ]
            );

        return [
            'cart' => $cart,

            'fulfillment' =>
                $deliveryQuote,

            'totals' =>
                $totals,
        ];
    }

    private function validatedCart(
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

        return $cart;
    }

    private function baseTotals(
        array $cart,
        float $shippingAmount
    ): array {
        $subtotal =
            round(
                (float) (
                    $cart['summary'][
                        'subtotal'
                    ]
                    ?? 0
                ),
                2
            );

        $vatAmount =
            round(
                $subtotal
                * self::VAT_RATE
                / (
                    100
                    + self::VAT_RATE
                ),
                2
            );

        $shippingAmount =
            round(
                $shippingAmount,
                2
            );

        return [
            'subtotal' =>
                $subtotal,

            'vat_rate' =>
                self::VAT_RATE,

            'vat_amount' =>
                $vatAmount,

            'shipping_amount' =>
                $shippingAmount,

            'grand_total' =>
                round(
                    $subtotal
                    + $shippingAmount,
                    2
                ),

            'prices_include_vat' =>
                true,
        ];
    }
}