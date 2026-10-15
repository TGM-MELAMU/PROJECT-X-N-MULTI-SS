<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Request;
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
            $orders ?? new OrderService();
    }

    public function index(
        Request $request,
        array $user
    ): void {
        try {
            $result =
                $this->orders
                    ->listCustomerOrders(
                        $user,
                        $request->query()
                    );

            Response::json([
                'success' => true,
                'message' =>
                    'Orders retrieved successfully.',
                'data' =>
                    $result['orders'],

                'meta' =>
                    $result['meta'],
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
            DomainException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 403);
        }
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
                    'order' => $order,
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
                '[Order] '
                . $exception->getMessage()
            );

            Response::json([
                'success' => false,
                'message' =>
                    'Unable to retrieve order.',
            ], 500);
        }
    }

    public function cancel(
        array $user,
        string $orderNumber
    ): void {
        try {
            $result =
                $this->orders
                    ->cancelCustomerOrder(
                        $user,
                        $orderNumber
                    );

            Response::json([
                'success' => true,
                'message' =>
                    'Order cancelled successfully.',
                'data' => [
                    'order' =>
                        $result,
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
            ], 409);
        } catch (
            Throwable $exception
        ) {
            error_log(
                '[Order Cancellation] '
                . $exception->getMessage()
            );

            Response::json([
                'success' => false,
                'message' =>
                    'Unable to cancel order.',
            ], 500);
        }
    }
}