<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\ProductService;
use MultiSS\Services\SessionAuthService;

final class ProductController
{
    private ProductService $productService;
    private SessionAuthService $sessionAuthService;

    public function __construct(
        ?ProductService $productService = null,
        ?SessionAuthService $sessionAuthService = null
    ) {
        $this->productService =
            $productService ?? new ProductService();

        $this->sessionAuthService =
            $sessionAuthService ?? new SessionAuthService();
    }

    public function index(Request $request): void
    {
        $query = $request->query();

        $page = isset($query['page'])
            && is_numeric($query['page'])
                ? (int) $query['page']
                : 1;

        $perPage = isset($query['per_page'])
            && is_numeric($query['per_page'])
                ? (int) $query['per_page']
                : 20;

        $search = isset($query['search'])
            ? (string) $query['search']
            : null;

        $category = isset($query['category'])
            ? (string) $query['category']
            : null;

        $sort = isset($query['sort'])
            ? (string) $query['sort']
            : 'newest';

        $user = $this->sessionAuthService->currentUser();

        $canViewPrices =
            $user !== null
            && ($user['email_verified'] ?? false) === true;

        $result = $this->productService->getPublicProducts(
            page: $page,
            perPage: $perPage,
            canViewPrices: $canViewPrices,
            search: $search,
            categorySlug: $category,
            sort: $sort
        );

        Response::json([
            'success' => true,
            'data' => $result,
        ], 200);
    }

    public function show(string $slug): void
    {
        $user = $this->sessionAuthService->currentUser();

        $canViewPrices =
            $user !== null
            && ($user['email_verified'] ?? false) === true;

        $product =
            $this->productService->getPublicProductBySlug(
                slug: $slug,
                canViewPrices: $canViewPrices
            );

        if ($product === null) {
            Response::json([
                'success' => false,
                'message' => 'Product not found',
            ], 404);

            return;
        }

        Response::json([
            'success' => true,
            'data' => $product,
        ], 200);
    }
}