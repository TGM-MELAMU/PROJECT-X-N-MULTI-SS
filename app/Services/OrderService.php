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

    public function __construct(
        ?OrderRepository $orders = null
    ) {
        $this->orders =
            $orders ?? new OrderRepository();
    }

    public function createPendingOrder(
        array $user,
        array $data
    ): array {
        if (
            ($user['email_verified'] ?? false)
            !== true
        ) {
            throw new DomainException(
                'Email verification is required before checkout.'
            );
        }

        $userId =
            (int) ($user['user_id'] ?? 0);

        if ($userId <= 0) {
            throw new DomainException(
                'Authentication required.'
            );
        }

        $addressId =
            $this->positiveInt(
                $data['address_id'] ?? null,
                'Address ID'
            );

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

        $firstName =
            trim(
                (string) (
                    $user['first_name']
                    ?? ''
                )
            );

        $lastName =
            trim(
                (string) (
                    $user['last_name']
                    ?? ''
                )
            );

        $recipientName =
            trim(
                $firstName
                . ' '
                . $lastName
            );

        if ($recipientName === '') {
            throw new DomainException(
                'Customer name is required for checkout.'
            );
        }

        $orderNumber =
            $this->createOrderNumber();

        return
            $this->orders
                ->createPendingOrder(
                    $userId,
                    $addressId,
                    $recipientName,
                    $contactNumber,
                    $orderNumber
                );
    }

    public function getCustomerOrder(
        array $user,
        string $orderNumber
    ): array {
        if (
            ($user['email_verified'] ?? false)
            !== true
        ) {
            throw new DomainException(
                'Email verification is required to view orders.'
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

        return $order;
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
                $field
                . ' must be a positive integer.'
            );
        }

        return (int) $validated;
    }
}