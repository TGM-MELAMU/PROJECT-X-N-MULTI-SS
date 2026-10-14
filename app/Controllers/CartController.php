<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\CartService;
use OutOfBoundsException;

final class CartController
{
    private CartService $cart;

    public function __construct(
        ?CartService $cart = null
    ) {
        $this->cart =
            $cart ?? new CartService();
    }

    public function index(
        Request $request,
        array $user
    ): void {
        $cart =
            $this->cart->getCart(
                (int) $user['user_id'],
                $this->canViewPrices($user)
            );

        Response::json([
            'success' => true,
            'data' => [
                'cart' => $cart,
            ],
        ], 200);
    }

    public function store(
        Request $request,
        array $user
    ): void {
        try {
            $cart =
                $this->cart->addItem(
                    (int) $user['user_id'],
                    $request->body(),
                    $this->canViewPrices(
                        $user
                    )
                );

            Response::json([
                'success' => true,
                'message' =>
                    'Item added to cart.',
                'data' => [
                    'cart' => $cart,
                ],
            ], 200);
        } catch (
            InvalidArgumentException $exception
        ) {
            $this->error(
                $exception->getMessage(),
                422
            );
        } catch (
            OutOfBoundsException $exception
        ) {
            $this->error(
                $exception->getMessage(),
                404
            );
        } catch (
            DomainException $exception
        ) {
            $this->error(
                $exception->getMessage(),
                409
            );
        }
    }

    public function update(
        Request $request,
        array $user,
        int $cartItemId
    ): void {
        try {
            $cart =
                $this->cart->updateItem(
                    (int) $user['user_id'],
                    $cartItemId,
                    $request->body(),
                    $this->canViewPrices(
                        $user
                    )
                );

            Response::json([
                'success' => true,
                'message' =>
                    'Cart item updated.',
                'data' => [
                    'cart' => $cart,
                ],
            ], 200);
        } catch (
            InvalidArgumentException $exception
        ) {
            $this->error(
                $exception->getMessage(),
                422
            );
        } catch (
            OutOfBoundsException $exception
        ) {
            $this->error(
                $exception->getMessage(),
                404
            );
        } catch (
            DomainException $exception
        ) {
            $this->error(
                $exception->getMessage(),
                409
            );
        }
    }

    public function destroy(
        array $user,
        int $cartItemId
    ): void {
        try {
            $cart =
                $this->cart->removeItem(
                    (int) $user['user_id'],
                    $cartItemId,
                    $this->canViewPrices(
                        $user
                    )
                );

            Response::json([
                'success' => true,
                'message' =>
                    'Item removed from cart.',
                'data' => [
                    'cart' => $cart,
                ],
            ], 200);
        } catch (
            InvalidArgumentException $exception
        ) {
            $this->error(
                $exception->getMessage(),
                422
            );
        } catch (
            OutOfBoundsException $exception
        ) {
            $this->error(
                $exception->getMessage(),
                404
            );
        }
    }

    private function canViewPrices(
        array $user
    ): bool {
        return
            ($user['email_verified'] ?? false)
            === true;
    }

    private function error(
        string $message,
        int $status
    ): void {
        Response::json([
            'success' => false,
            'message' => $message,
        ], $status);
    }
}