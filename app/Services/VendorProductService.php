<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Repositories\VendorProductRepository;
use OutOfBoundsException;

final class VendorProductService
{
    private VendorProductRepository $products;

    public function __construct(
        ?VendorProductRepository $products = null
    ) {
        $this->products =
            $products ?? new VendorProductRepository();
    }

    public function create(
        int $userId,
        array $data
    ): array {
        $vendorId = $this->positiveInt(
            $data['vendor_id'] ?? null,
            'vendor_id'
        );

        $this->assertCanManageVendor(
            $userId,
            $vendorId
        );

        $product = [
            'product_name' =>
                $this->requiredString(
                    $data['product_name'] ?? null,
                    'product_name'
                ),

            'slug' =>
                $this->createSlug(
                    (string) ($data['product_name'] ?? '')
                ),

            'description' =>
                $this->optionalString(
                    $data['description'] ?? null
                ),

            'brand' =>
                $this->optionalString(
                    $data['brand'] ?? null
                ),
        ];

        $categoryIds =
            $this->normalizeCategoryIds(
                $data['category_ids'] ?? []
            );

        if ($categoryIds === []) {
            throw new InvalidArgumentException(
                'At least one category is required.'
            );
        }

        $this->assertCategoriesExist(
            $categoryIds
        );

        $variants =
            $this->normalizeVariants(
                $data['variants'] ?? []
            );

        if ($variants === []) {
            throw new InvalidArgumentException(
                'At least one product variant is required.'
            );
        }

        $images =
            $this->normalizeImages(
                $data['images'] ?? []
            );

        $specifications =
            $this->normalizeSpecifications(
                $data['specifications'] ?? []
            );

        $productId =
            $this->products->createProduct(
                vendorId: $vendorId,
                product: $product,
                categoryIds: $categoryIds,
                variants: $variants,
                images: $images,
                specifications: $specifications
            );

        return $this->products->findProductById(
            $productId
        ) ?? [];
    }

    public function update(
        int $userId,
        int $productId,
        array $data
    ): array {
        $existing =
            $this->products->findProductById(
                $productId
            );

        if ($existing === null) {
            throw new OutOfBoundsException(
                'Product not found.'
            );
        }

        $vendorId =
            (int) $existing['vendor_id'];

        $this->assertCanManageVendor(
            $userId,
            $vendorId
        );

        if (
            isset($data['vendor_id'])
            && (int) $data['vendor_id'] !== $vendorId
        ) {
            throw new DomainException(
                'A product cannot be moved to another vendor.'
            );
        }

        $product = [
            'product_name' =>
                array_key_exists('product_name', $data)
                    ? $this->requiredString(
                        $data['product_name'],
                        'product_name'
                    )
                    : $existing['product_name'],

            'description' =>
                array_key_exists('description', $data)
                    ? $this->optionalString(
                        $data['description']
                    )
                    : $existing['description'],

            'brand' =>
                array_key_exists('brand', $data)
                    ? $this->optionalString(
                        $data['brand']
                    )
                    : $existing['brand'],
        ];

        $categoryIds = null;

        if (array_key_exists('category_ids', $data)) {
            $categoryIds =
                $this->normalizeCategoryIds(
                    $data['category_ids']
                );

            if ($categoryIds === []) {
                throw new InvalidArgumentException(
                    'At least one category is required.'
                );
            }

            $this->assertCategoriesExist(
                $categoryIds
            );
        }

        $variants = null;

        if (array_key_exists('variants', $data)) {
            $variants =
                $this->normalizeVariants(
                    $data['variants']
                );
        }

        $images = null;

        if (array_key_exists('images', $data)) {
            $images =
                $this->normalizeImages(
                    $data['images']
                );
        }

        $specifications = null;

        if (array_key_exists('specifications', $data)) {
            $specifications =
                $this->normalizeSpecifications(
                    $data['specifications']
                );
        }

        $this->products->updateProduct(
            productId: $productId,
            vendorId: $vendorId,
            product: $product,
            categoryIds: $categoryIds,
            variants: $variants,
            images: $images,
            specifications: $specifications
        );

        return $this->products->findProductById(
            $productId
        ) ?? [];
    }

    private function assertCanManageVendor(
        int $userId,
        int $vendorId
    ): void {
        $membership =
            $this->products->findActiveMembership(
                $userId,
                $vendorId
            );

        if ($membership === null) {
            throw new DomainException(
                'You do not have access to this vendor.'
            );
        }

        if (
            !in_array(
                $membership['vendor_role'],
                ['owner', 'manager'],
                true
            )
        ) {
            throw new DomainException(
                'You do not have permission to manage vendor products.'
            );
        }
    }

    private function assertCategoriesExist(
        array $categoryIds
    ): void {
        $count =
            $this->products->countActiveCategories(
                $categoryIds
            );

        if ($count !== count($categoryIds)) {
            throw new InvalidArgumentException(
                'One or more categories are invalid or inactive.'
            );
        }
    }

    private function normalizeCategoryIds(
        mixed $value
    ): array {
        if (!is_array($value)) {
            throw new InvalidArgumentException(
                'category_ids must be an array.'
            );
        }

        $ids = [];

        foreach ($value as $categoryId) {
            if (
                !is_int($categoryId)
                && !ctype_digit((string) $categoryId)
            ) {
                throw new InvalidArgumentException(
                    'Each category ID must be a positive integer.'
                );
            }

            $categoryId =
                (int) $categoryId;

            if ($categoryId < 1) {
                throw new InvalidArgumentException(
                    'Each category ID must be a positive integer.'
                );
            }

            $ids[] = $categoryId;
        }

        return array_values(
            array_unique($ids)
        );
    }

    private function normalizeVariants(
        mixed $value
    ): array {
        if (!is_array($value)) {
            throw new InvalidArgumentException(
                'variants must be an array.'
            );
        }

        $variants = [];

        foreach ($value as $variant) {
            if (!is_array($variant)) {
                throw new InvalidArgumentException(
                    'Each variant must be an object.'
                );
            }

            $variantId = null;

            if (
                isset($variant['variant_id'])
                && $variant['variant_id'] !== ''
            ) {
                $variantId = $this->positiveInt(
                    $variant['variant_id'],
                    'variant_id'
                );
            }

            $status =
                strtolower(
                    trim(
                        (string) (
                            $variant['variant_status']
                            ?? 'active'
                        )
                    )
                );

            if (
                !in_array(
                    $status,
                    ['active', 'inactive'],
                    true
                )
            ) {
                throw new InvalidArgumentException(
                    'variant_status must be active or inactive.'
                );
            }

            $variants[] = [
                'variant_id' =>
                    $variantId,

                'variant_name' =>
                    $this->requiredString(
                        $variant['variant_name'] ?? null,
                        'variant_name'
                    ),

                'sku' =>
                    $this->requiredString(
                        $variant['sku'] ?? null,
                        'sku'
                    ),

                'model_number' =>
                    $this->optionalString(
                        $variant['model_number'] ?? null
                    ),

                'unit' =>
                    $this->optionalString(
                        $variant['unit'] ?? null
                    ),

                'selling_price' =>
                    $this->nonNegativeDecimal(
                        $variant['selling_price'] ?? null,
                        'selling_price'
                    ),

                'cost_price' =>
                    $this->optionalNonNegativeDecimal(
                        $variant['cost_price'] ?? null,
                        'cost_price'
                    ),

                'tax_percentage' =>
                    $this->optionalNonNegativeDecimal(
                        $variant['tax_percentage'] ?? null,
                        'tax_percentage'
                    ),

                'variant_status' =>
                    $status,

                'quantity_in_stock' =>
                    $this->nonNegativeInt(
                        $variant['quantity_in_stock'] ?? 0,
                        'quantity_in_stock'
                    ),

                'reorder_level' =>
                    $this->nonNegativeInt(
                        $variant['reorder_level'] ?? 0,
                        'reorder_level'
                    ),
            ];
        }

        return $variants;
    }

    private function normalizeImages(
        mixed $value
    ): array {
        if (!is_array($value)) {
            throw new InvalidArgumentException(
                'images must be an array.'
            );
        }

        $images = [];

        foreach ($value as $index => $image) {
            if (!is_array($image)) {
                throw new InvalidArgumentException(
                    'Each image must be an object.'
                );
            }

            $images[] = [
                'image_url' =>
                    $this->requiredString(
                        $image['image_url'] ?? null,
                        'image_url'
                    ),

                'alt_text' =>
                    $this->optionalString(
                        $image['alt_text'] ?? null
                    ),

                'is_primary' =>
                    !empty($image['is_primary'])
                        ? 1
                        : 0,

                'sort_order' =>
                    $this->nonNegativeInt(
                        $image['sort_order'] ?? $index,
                        'sort_order'
                    ),
            ];
        }

        return $images;
    }

    private function normalizeSpecifications(
        mixed $value
    ): array {
        if (!is_array($value)) {
            throw new InvalidArgumentException(
                'specifications must be an array.'
            );
        }

        $specifications = [];

        foreach ($value as $index => $specification) {
            if (!is_array($specification)) {
                throw new InvalidArgumentException(
                    'Each specification must be an object.'
                );
            }

            $specifications[] = [
                'specification_name' =>
                    $this->requiredString(
                        $specification['name']
                            ?? $specification['specification_name']
                            ?? null,
                        'specification name'
                    ),

                'specification_value' =>
                    $this->requiredString(
                        $specification['value']
                            ?? $specification['specification_value']
                            ?? null,
                        'specification value'
                    ),

                'sort_order' =>
                    $this->nonNegativeInt(
                        $specification['sort_order'] ?? $index,
                        'sort_order'
                    ),
            ];
        }

        return $specifications;
    }

    private function requiredString(
        mixed $value,
        string $field
    ): string {
        $value = trim((string) $value);

        if ($value === '') {
            throw new InvalidArgumentException(
                $field . ' is required.'
            );
        }

        return $value;
    }

    private function optionalString(
        mixed $value
    ): ?string {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === ''
            ? null
            : $value;
    }

    private function positiveInt(
        mixed $value,
        string $field
    ): int {
        if (
            !is_int($value)
            && !ctype_digit((string) $value)
        ) {
            throw new InvalidArgumentException(
                $field . ' must be a positive integer.'
            );
        }

        $value = (int) $value;

        if ($value < 1) {
            throw new InvalidArgumentException(
                $field . ' must be a positive integer.'
            );
        }

        return $value;
    }

    private function nonNegativeInt(
        mixed $value,
        string $field
    ): int {
        if (
            filter_var(
                $value,
                FILTER_VALIDATE_INT
            ) === false
            || (int) $value < 0
        ) {
            throw new InvalidArgumentException(
                $field . ' must be zero or greater.'
            );
        }

        return (int) $value;
    }

    private function nonNegativeDecimal(
        mixed $value,
        string $field
    ): string {
        if (
            !is_numeric($value)
            || (float) $value < 0
        ) {
            throw new InvalidArgumentException(
                $field . ' must be zero or greater.'
            );
        }

        return number_format(
            (float) $value,
            2,
            '.',
            ''
        );
    }

    private function optionalNonNegativeDecimal(
        mixed $value,
        string $field
    ): ?string {
        if (
            $value === null
            || $value === ''
        ) {
            return null;
        }

        return $this->nonNegativeDecimal(
            $value,
            $field
        );
    }

    private function createSlug(
        string $productName
    ): string {
        $slug = strtolower(
            trim(
                (string) preg_replace(
                    '/[^a-zA-Z0-9]+/',
                    '-',
                    $productName
                ),
                '-'
            )
        );

        if ($slug === '') {
            $slug = 'product';
        }

        $slug = substr(
            $slug,
            0,
            180
        );

        return $slug
            . '-'
            . bin2hex(random_bytes(4));
    }
}