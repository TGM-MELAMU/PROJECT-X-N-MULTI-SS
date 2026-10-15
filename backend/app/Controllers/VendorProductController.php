<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\VendorProductService;
use OutOfBoundsException;

final class VendorProductController
{
    private VendorProductService $products;

    public function __construct(
        ?VendorProductService $products = null
    ) {
        $this->products =
            $products ?? new VendorProductService();
    }

    public function store(
        Request $request,
        array $user
    ): void {
        try {
            $product = $this->products->create(
                (int) $user['user_id'],
                $request->body()
            );

            Response::json([
                'success' => true,
                'message' =>
                    'Product created and submitted for approval.',
                'data' => [
                    'product' => $product,
                ],
            ], 201);
        } catch (InvalidArgumentException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        } catch (DomainException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 403);
        }
    }

    public function update(
        Request $request,
        array $user,
        int $productId
    ): void {
        try {
            $product = $this->products->update(
                (int) $user['user_id'],
                $productId,
                $request->body()
            );

            Response::json([
                'success' => true,
                'message' =>
                    'Product updated and submitted for approval.',
                'data' => [
                    'product' => $product,
                ],
            ], 200);
        } catch (InvalidArgumentException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        } catch (DomainException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 403);
        } catch (OutOfBoundsException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 404);
        }
    }
}