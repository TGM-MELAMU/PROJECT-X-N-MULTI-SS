<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\CheckoutService;
use MultiSS\Services\OrderService;
use OutOfBoundsException;

final class CheckoutController
{
    private CheckoutService $checkout;

    private OrderService $orders;

    public function __construct(
        ?CheckoutService $checkout = null,
        ?OrderService $orders = null
    ) {
        $this->checkout =
            $checkout ?? new CheckoutService();

        $this->orders =
            $orders ?? new OrderService();
    }

    public function summary(
        Request $request,
        array $user
    ): void {
        try {
            $summary =
                $this->checkout->getSummary(
                    (int) $user['user_id'],
                    ($user['email_verified'] ?? false)
                        === true
                );

            Response::json([
                'success' => true,
                'data' => [
                    'checkout' => $summary,
                ],
            ], 200);
        } catch (
            DomainException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 409);
        }
    }

    public function createOrder(
        Request $request,
        array $user
    ): void {
        try {
            $order =
                $this->orders
                    ->createPendingOrder(
                        $user,
                        $request->body()
                    );

            Response::json([
                'success' => true,
                'message' =>
                    'Pending order created.',
                'data' => [
                    'order' => $order,
                ],
            ], 201);
        } catch (
            InvalidArgumentException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 422);
        } catch (
            OutOfBoundsException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 404);
        } catch (
            DomainException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 409);
        }
    }
}
