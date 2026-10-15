<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Repositories\ProductRepository;

final class ProductService
{
    private ProductRepository $productRepository;

    public function __construct(
        ?ProductRepository $productRepository = null
    ) {
        $this->productRepository =
            $productRepository ?? new ProductRepository();
    }

    public function getPublicProducts(
        int $page = 1,
        int $perPage = 20,
        bool $canViewPrices = false,
        ?string $search = null,
        ?string $categorySlug = null,
        string $sort = 'newest'
    ): array {
        $page = max(1, $page);

        $perPage = max(
            1,
            min($perPage, 100)
        );

        $search = $this->normalizeOptionalString(
            $search
        );

        $categorySlug = $this->normalizeOptionalString(
            $categorySlug
        );

        $allowedSorts = [
            'newest',
            'name_asc',
            'name_desc',
            'price_asc',
            'price_desc',
        ];

        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'newest';
        }

        if (
            !$canViewPrices
            && in_array(
                $sort,
                ['price_asc', 'price_desc'],
                true
            )
        ) {
            $sort = 'newest';
        }

        $total =
            $this->productRepository->countPublicProducts(
                search: $search,
                categorySlug: $categorySlug
            );

        $totalPages = $total === 0
            ? 0
            : (int) ceil($total / $perPage);

        $offset =
            ($page - 1) * $perPage;

        $products =
            $this->productRepository->findPublicProducts(
                limit: $perPage,
                offset: $offset,
                search: $search,
                categorySlug: $categorySlug,
                sort: $sort
            );

        $products = array_map(
            function (array $product) use ($canViewPrices): array {
                return $this->formatPublicProduct(
                    $product,
                    $canViewPrices
                );
            },
            $products
        );

        return [
            'products' => $products,

            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'returned' => count($products),
                'total' => $total,
                'total_pages' => $totalPages,
            ],

            'filters' => [
                'search' => $search,
                'category' => $categorySlug,
                'sort' => $sort,
            ],
        ];
    }

    public function getPublicProductBySlug(
        string $slug,
        bool $canViewPrices = false
    ): ?array {
        $slug = trim($slug);

        if ($slug === '') {
            return null;
        }

        $product =
            $this->productRepository->findPublicProductBySlug(
                $slug
            );

        if ($product === null) {
            return null;
        }

        $productId =
            (int) $product['product_id'];

        $publicProduct =
            $this->formatPublicProduct(
                $product,
                $canViewPrices
            );

        $variants =
            $this->productRepository
                ->findPublicVariantsByProductId(
                    $productId
                );

        $images =
            $this->productRepository
                ->findProductImages(
                    $productId
                );

        $specifications =
            $this->productRepository
                ->findProductSpecifications(
                    $productId
                );

        $publicProduct['variants'] =
            array_map(
                function (array $variant) use ($canViewPrices): array {
                    return $this->formatPublicVariant(
                        $variant,
                        $canViewPrices
                    );
                },
                $variants
            );

        $publicProduct['images'] =
            array_map(
                function (array $image): array {
                    return [
                        'image_id' =>
                            (int) $image['image_id'],

                        'image_url' =>
                            $image['image_url'],

                        'alt_text' =>
                            $image['alt_text'],

                        'is_primary' =>
                            (bool) $image['is_primary'],

                        'sort_order' =>
                            (int) $image['sort_order'],
                    ];
                },
                $images
            );

        $publicProduct['specifications'] =
            array_map(
                function (array $specification): array {
                    return [
                        'specification_id' =>
                            (int) $specification['specification_id'],

                        'name' =>
                            $specification['specification_name'],

                        'value' =>
                            $specification['specification_value'],

                        'sort_order' =>
                            (int) $specification['sort_order'],
                    ];
                },
                $specifications
            );

        return $publicProduct;
    }

    private function normalizeOptionalString(
        ?string $value
    ): ?string {
        if ($value === null) {
            return null;
        }

        $value = trim($value);

        return $value === ''
            ? null
            : $value;
    }

    private function formatPublicProduct(
        array $product,
        bool $canViewPrices
    ): array {
        $quantityInStock =
            (int) $product['quantity_in_stock'];

        $publicProduct = [
            'product_id' =>
                (int) $product['product_id'],

            'product_name' =>
                $product['product_name'],

            'slug' =>
                $product['slug'],

            'description' =>
                $product['description'],

            'brand' =>
                $product['brand'],

            'primary_image' =>
                $product['primary_image'],

            'availability' =>
                $quantityInStock > 5
                    ? 'In Stock'
                    : 'Out of Stock',
        ];

        if ($canViewPrices) {
            $publicProduct['starting_price'] =
                $product['starting_price'];
        }

        return $publicProduct;
    }

    private function formatPublicVariant(
        array $variant,
        bool $canViewPrices
    ): array {
        $quantityInStock =
            (int) $variant['quantity_in_stock'];

        $publicVariant = [
            'variant_id' =>
                (int) $variant['variant_id'],

            'variant_name' =>
                $variant['variant_name'],

            'sku' =>
                $variant['sku'],

            'model_number' =>
                $variant['model_number'],

            'unit' =>
                $variant['unit'],

            'availability' =>
                $quantityInStock > 5
                    ? 'In Stock'
                    : 'Out of Stock',
        ];

        if ($canViewPrices) {
            $publicVariant['selling_price'] =
                $variant['selling_price'];
        }

        return $publicVariant;
    }
}