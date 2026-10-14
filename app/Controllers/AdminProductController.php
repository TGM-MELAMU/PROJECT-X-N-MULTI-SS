<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\AdminProductService;
use OutOfBoundsException;

final class AdminProductController
{
    private AdminProductService $products;

    public function __construct(
        ?AdminProductService $products = null
    ) {
        $this->products =
            $products ?? new AdminProductService();
    }

    public function pending(
        Request $request
    ): void {
        $products =
            $this->products->getPendingProducts();

        Response::json([
            'success' => true,
            'data' => [
                'products' => $products,
            ],
        ], 200);
    }

    public function approve(
        array $user,
        int $productId
    ): void {
        try {
            $product =
                $this->products->approve(
                    $productId,
                    (int) $user['user_id']
                );

            Response::json([
                'success' => true,
                'message' => 'Product approved.',
                'data' => [
                    'product' => $product,
                ],
            ], 200);
        } catch (OutOfBoundsException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 404);
        } catch (DomainException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 409);
        }
    }

    public function reject(
        Request $request,
        array $user,
        int $productId
    ): void {
        try {
            $body = $request->body();

            $product =
                $this->products->reject(
                    $productId,
                    (int) $user['user_id'],
                    $body['reason'] ?? null
                );

            Response::json([
                'success' => true,
                'message' => 'Product rejected.',
                'data' => [
                    'product' => $product,
                ],
            ], 200);
        } catch (InvalidArgumentException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        } catch (OutOfBoundsException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 404);
        } catch (DomainException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 409);
        }
    }
}