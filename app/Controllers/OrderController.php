<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Response;
use MultiSS\Services\OrderService;
use OutOfBoundsException;
use Throwable;

final class OrderController
{
    private OrderService $orders;

    public function __construct(
        ?OrderService $orders = null
    ) {
        $this->orders =
            $orders
            ?? new OrderService();
    }

    public function show(
        array $user,
        string $orderNumber
    ): void {
        try {
            $order =
                $this->orders
                    ->getCustomerOrder(
                        $user,
                        $orderNumber
                    );

            Response::json([
                'success' => true,
                'message' =>
                    'Order retrieved successfully.',
                'data' => [
                    'order' =>
                        $order,
                ],
            ], 200);
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
                    'Order not found.',
            ], 404);
        } catch (
            DomainException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 403);
        } catch (
            Throwable $exception
        ) {
            error_log(
                '[Order Confirmation] '
                . $exception->getMessage()
            );

            Response::json([
                'success' => false,
                'message' =>
                    'Unable to retrieve order.',
            ], 500);
        }
    }
}