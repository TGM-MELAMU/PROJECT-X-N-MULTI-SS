<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use InvalidArgumentException;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\AddressService;

final class AddressController
{
    private AddressService $addresses;

    public function __construct(
        ?AddressService $addresses = null
    ) {
        $this->addresses =
            $addresses ?? new AddressService();
    }

    public function index(
        Request $request,
        array $user
    ): void {
        $addresses =
            $this->addresses->getAddresses(
                (int) $user['user_id']
            );

        Response::json([
            'success' => true,
            'data' => [
                'addresses' => $addresses,
            ],
        ], 200);
    }

    public function store(
        Request $request,
        array $user
    ): void {
        try {
            $address =
                $this->addresses->create(
                    (int) $user['user_id'],
                    $request->body()
                );

            Response::json([
                'success' => true,
                'message' =>
                    'Address saved.',
                'data' => [
                    'address' => $address,
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
        }
    }
}