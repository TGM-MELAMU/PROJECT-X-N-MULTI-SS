<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Repositories\OrderRepository;
use OutOfBoundsException;

final class OrderService
{
    private OrderRepository $orders;

    private DeliveryService $delivery;

    private array $config;

    public function __construct(
        ?OrderRepository $orders = null,
        ?DeliveryService $delivery = null,
        ?array $config = null
    ) {
        $this->orders =
            $orders ?? new OrderRepository();

        $this->delivery =
            $delivery ?? new DeliveryService();

        $this->config =
            $config
            ?? require __DIR__
                . '/../../config/orders.php';
    }

    public function createPendingOrder(
        array $user,
        array $data
    ): array {
        $userId =
            $this->verifiedUserId(
                $user,
                'checkout'
            );

        /*
         * Recalculate fulfillment server-side when
         * the order is actually created.
         *
         * We do not trust a delivery fee supplied
         * by the frontend.
         */
        $fulfillment =
            $this->delivery->quote(
                $userId,
                $data
            );

        $addressId =
            $fulfillment['address_id']
                !== null
                    ? (int) $fulfillment[
                        'address_id'
                    ]
                    : null;

        $contactNumber =
            trim(
                (string) (
                    $data['contact_number']
                    ?? ''
                )
            );

        if ($contactNumber === '') {
            throw new InvalidArgumentException(
                'Contact number is required.'
            );
        }

        if (
            mb_strlen($contactNumber) > 30
        ) {
            throw new InvalidArgumentException(
                'Contact number may not exceed 30 characters.'
            );
        }

        $recipientName =
            trim(
                trim(
                    (string) (
                        $user['first_name']
                        ?? ''
                    )
                )
                . ' '
                . trim(
                    (string) (
                        $user['last_name']
                        ?? ''
                    )
                )
            );

        if ($recipientName === '') {
            throw new DomainException(
                'Customer name is required for checkout.'
            );
        }

        $order =
            $this->orders
                ->createPendingOrder(
                    $userId,
                    $addressId,
                    $recipientName,
                    $contactNumber,
                    $this->createOrderNumber(),
                    $fulfillment
                );

        $order['fulfillment'] =
            $fulfillment;

        return $order;
    }

    public function listCustomerOrders(
        array $user,
        array $query
    ): array {
        $userId =
            $this->verifiedUserId(
                $user,
                'view orders'
            );

        $page =
            $this->paginationInt(
                $query['page'] ?? 1,
                1,
                100000
            );

        $perPage =
            $this->paginationInt(
                $query['per_page'] ?? 20,
                1,
                100
            );

        return $this->orders
            ->listCustomerOrders(
                $userId,
                $page,
                $perPage
            );
    }

    public function getCustomerOrder(
        array $user,
        string $orderNumber
    ): array {
        $userId =
            $this->verifiedUserId(
                $user,
                'view orders'
            );

        $orderNumber =
            $this->validatedOrderNumber(
                $orderNumber
            );

        $order =
            $this->orders
                ->findCustomerOrderByNumber(
                    $userId,
                    $orderNumber
                );

        if ($order === null) {
            throw new OutOfBoundsException(
                'Order not found.'
            );
        }

        $order['fulfillment'] =
            $this->orders
                ->findCustomerFulfillmentByOrderId(
                    (int) $order['order_id']
                );

        return $order;
    }

    public function cancelCustomerOrder(
        array $user,
        string $orderNumber
    ): array {
        $userId =
            $this->verifiedUserId(
                $user,
                'cancel orders'
            );

        $orderNumber =
            $this->validatedOrderNumber(
                $orderNumber
            );

        return $this->orders
            ->cancelCustomerOrder(
                $userId,
                $orderNumber,
                $this->config[
                    'customer_cancellable_statuses'
                ] ?? [],
                $this->config[
                    'blocked_fulfillment_statuses'
                ] ?? []
            );
    }

    private function verifiedUserId(
        array $user,
        string $action
    ): int {
        if (
            ($user['email_verified'] ?? false)
            !== true
        ) {
            throw new DomainException(
                'Email verification is required to '
                . $action
                . '.'
            );
        }

        $userId =
            (int) (
                $user['user_id']
                ?? 0
            );

        if ($userId <= 0) {
            throw new DomainException(
                'Authentication required.'
            );
        }

        return $userId;
    }

    private function validatedOrderNumber(
        string $orderNumber
    ): string {
        $orderNumber =
            trim($orderNumber);

        if ($orderNumber === '') {
            throw new InvalidArgumentException(
                'Order number is required.'
            );
        }

        if (
            mb_strlen($orderNumber) > 100
        ) {
            throw new InvalidArgumentException(
                'Invalid order number.'
            );
        }

        return $orderNumber;
    }

    private function paginationInt(
        mixed $value,
        int $minimum,
        int $maximum
    ): int {
        $validated =
            filter_var(
                $value,
                FILTER_VALIDATE_INT,
                [
                    'options' => [
                        'min_range' =>
                            $minimum,

                        'max_range' =>
                            $maximum,
                    ],
                ]
            );

        if ($validated === false) {
            throw new InvalidArgumentException(
                'Invalid pagination value.'
            );
        }

        return (int) $validated;
    }

    private function createOrderNumber(): string
    {
        return
            'MSS-'
            . date('YmdHis')
            . '-'
            . strtoupper(
                bin2hex(
                    random_bytes(3)
                )
            );
    }
}