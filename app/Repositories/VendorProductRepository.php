<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;
use RuntimeException;
use Throwable;

final class VendorProductRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo =
            $pdo ?? Database::connection();
    }

    public function findActiveMembership(
        int $userId,
        int $vendorId
    ): ?array {
        $statement = $this->pdo->prepare(
            '
            SELECT
                vu.vendor_user_id,
                vu.vendor_id,
                vu.user_id,
                vu.vendor_role,
                vu.status,
                v.vendor_status

            FROM vendor_users vu

            INNER JOIN vendors v
                ON v.vendor_id = vu.vendor_id

            WHERE
                vu.user_id = :user_id
                AND vu.vendor_id = :vendor_id
                AND vu.status = \'active\'
                AND v.vendor_status = \'active\'

            LIMIT 1
            '
        );

        $statement->execute([
            'user_id' => $userId,
            'vendor_id' => $vendorId,
        ]);

        $membership = $statement->fetch();

        return $membership === false
            ? null
            : $membership;
    }

    public function findProductById(
        int $productId
    ): ?array {
        $statement = $this->pdo->prepare(
            '
            SELECT
                product_id,
                vendor_id,
                product_name,
                slug,
                description,
                brand,
                product_status,
                approval_status,
                reviewed_by,
                reviewed_at,
                rejection_reason,
                created_at,
                updated_at

            FROM products

            WHERE
                product_id = :product_id

            LIMIT 1
            '
        );

        $statement->execute([
            'product_id' => $productId,
        ]);

        $product = $statement->fetch();

        return $product === false
            ? null
            : $product;
    }

    public function countActiveCategories(
        array $categoryIds
    ): int {
        if ($categoryIds === []) {
            return 0;
        }

        $placeholders = [];
        $parameters = [];

        foreach ($categoryIds as $index => $categoryId) {
            $placeholder = ':category_' . $index;

            $placeholders[] = $placeholder;
            $parameters[$placeholder] = $categoryId;
        }

        $sql = '
            SELECT
                COUNT(*)

            FROM categories

            WHERE
                status = \'active\'
                AND category_id IN (
                    ' . implode(', ', $placeholders) . '
                )
        ';

        $statement = $this->pdo->prepare($sql);

        foreach ($parameters as $name => $value) {
            $statement->bindValue(
                $name,
                $value,
                PDO::PARAM_INT
            );
        }

        $statement->execute();

        return (int) $statement->fetchColumn();
    }

    public function createProduct(
        int $vendorId,
        array $product,
        array $categoryIds,
        array $variants,
        array $images,
        array $specifications
    ): int {
        try {
            $this->pdo->beginTransaction();

            $statement = $this->pdo->prepare(
                '
                INSERT INTO products (
                    vendor_id,
                    product_name,
                    slug,
                    description,
                    brand,
                    product_status,
                    approval_status,
                    reviewed_by,
                    reviewed_at,
                    rejection_reason
                ) VALUES (
                    :vendor_id,
                    :product_name,
                    :slug,
                    :description,
                    :brand,
                    \'draft\',
                    \'pending\',
                    NULL,
                    NULL,
                    NULL
                )
                '
            );

            $statement->execute([
                'vendor_id' => $vendorId,
                'product_name' => $product['product_name'],
                'slug' => $product['slug'],
                'description' => $product['description'],
                'brand' => $product['brand'],
            ]);

            $productId =
                (int) $this->pdo->lastInsertId();

            $this->replaceCategories(
                $productId,
                $categoryIds
            );

            $this->upsertVariants(
                $productId,
                $variants
            );

            $this->replaceImages(
                $productId,
                $images
            );

            $this->replaceSpecifications(
                $productId,
                $specifications
            );

            $this->pdo->commit();

            return $productId;
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    public function updateProduct(
        int $productId,
        int $vendorId,
        array $product,
        ?array $categoryIds,
        ?array $variants,
        ?array $images,
        ?array $specifications
    ): void {
        try {
            $this->pdo->beginTransaction();

            $statement = $this->pdo->prepare(
                '
                UPDATE products

                SET
                    product_name = :product_name,
                    description = :description,
                    brand = :brand,
                    product_status = \'draft\',
                    approval_status = \'pending\',
                    reviewed_by = NULL,
                    reviewed_at = NULL,
                    rejection_reason = NULL,
                    updated_at = CURRENT_TIMESTAMP

                WHERE
                    product_id = :product_id
                    AND vendor_id = :vendor_id
                '
            );

            $statement->execute([
                'product_name' => $product['product_name'],
                'description' => $product['description'],
                'brand' => $product['brand'],
                'product_id' => $productId,
                'vendor_id' => $vendorId,
            ]);

            if ($categoryIds !== null) {
                $this->replaceCategories(
                    $productId,
                    $categoryIds
                );
            }

            if ($variants !== null) {
                $this->upsertVariants(
                    $productId,
                    $variants
                );
            }

            if ($images !== null) {
                $this->replaceImages(
                    $productId,
                    $images
                );
            }

            if ($specifications !== null) {
                $this->replaceSpecifications(
                    $productId,
                    $specifications
                );
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    private function replaceCategories(
        int $productId,
        array $categoryIds
    ): void {
        $delete = $this->pdo->prepare(
            '
            DELETE FROM product_categories
            WHERE product_id = :product_id
            '
        );

        $delete->execute([
            'product_id' => $productId,
        ]);

        $insert = $this->pdo->prepare(
            '
            INSERT INTO product_categories (
                product_id,
                category_id
            ) VALUES (
                :product_id,
                :category_id
            )
            '
        );

        foreach ($categoryIds as $categoryId) {
            $insert->execute([
                'product_id' => $productId,
                'category_id' => $categoryId,
            ]);
        }
    }

    private function upsertVariants(
        int $productId,
        array $variants
    ): void {
        foreach ($variants as $variant) {
            $variantId =
                $variant['variant_id'] ?? null;

            if ($variantId !== null) {
                if (
                    !$this->variantBelongsToProduct(
                        $variantId,
                        $productId
                    )
                ) {
                    throw new RuntimeException(
                        'Variant does not belong to this product.'
                    );
                }

                $statement = $this->pdo->prepare(
                    '
                    UPDATE product_variants

                    SET
                        variant_name = :variant_name,
                        sku = :sku,
                        model_number = :model_number,
                        unit = :unit,
                        selling_price = :selling_price,
                        cost_price = :cost_price,
                        tax_percentage = :tax_percentage,
                        variant_status = :variant_status,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE
                        variant_id = :variant_id
                        AND product_id = :product_id
                    '
                );

                $statement->execute([
                    'variant_name' =>
                        $variant['variant_name'],

                    'sku' =>
                        $variant['sku'],

                    'model_number' =>
                        $variant['model_number'],

                    'unit' =>
                        $variant['unit'],

                    'selling_price' =>
                        $variant['selling_price'],

                    'cost_price' =>
                        $variant['cost_price'],

                    'tax_percentage' =>
                        $variant['tax_percentage'],

                    'variant_status' =>
                        $variant['variant_status'],

                    'variant_id' =>
                        $variantId,

                    'product_id' =>
                        $productId,
                ]);
            } else {
                $statement = $this->pdo->prepare(
                    '
                    INSERT INTO product_variants (
                        product_id,
                        variant_name,
                        sku,
                        model_number,
                        unit,
                        selling_price,
                        cost_price,
                        tax_percentage,
                        variant_status
                    ) VALUES (
                        :product_id,
                        :variant_name,
                        :sku,
                        :model_number,
                        :unit,
                        :selling_price,
                        :cost_price,
                        :tax_percentage,
                        :variant_status
                    )
                    '
                );

                $statement->execute([
                    'product_id' =>
                        $productId,

                    'variant_name' =>
                        $variant['variant_name'],

                    'sku' =>
                        $variant['sku'],

                    'model_number' =>
                        $variant['model_number'],

                    'unit' =>
                        $variant['unit'],

                    'selling_price' =>
                        $variant['selling_price'],

                    'cost_price' =>
                        $variant['cost_price'],

                    'tax_percentage' =>
                        $variant['tax_percentage'],

                    'variant_status' =>
                        $variant['variant_status'],
                ]);

                $variantId =
                    (int) $this->pdo->lastInsertId();
            }

            $inventory = $this->pdo->prepare(
                '
                INSERT INTO inventory (
                    variant_id,
                    quantity_in_stock,
                    reorder_level
                ) VALUES (
                    :variant_id,
                    :quantity_in_stock,
                    :reorder_level
                )

                ON DUPLICATE KEY UPDATE
                    quantity_in_stock =
                        VALUES(quantity_in_stock),

                    reorder_level =
                        VALUES(reorder_level),

                    updated_at =
                        CURRENT_TIMESTAMP
                '
            );

            $inventory->execute([
                'variant_id' =>
                    $variantId,

                'quantity_in_stock' =>
                    $variant['quantity_in_stock'],

                'reorder_level' =>
                    $variant['reorder_level'],
            ]);
        }
    }

    private function variantBelongsToProduct(
        int $variantId,
        int $productId
    ): bool {
        $statement = $this->pdo->prepare(
            '
            SELECT 1

            FROM product_variants

            WHERE
                variant_id = :variant_id
                AND product_id = :product_id

            LIMIT 1
            '
        );

        $statement->execute([
            'variant_id' => $variantId,
            'product_id' => $productId,
        ]);

        return $statement->fetchColumn() !== false;
    }

    private function replaceImages(
        int $productId,
        array $images
    ): void {
        $delete = $this->pdo->prepare(
            '
            DELETE FROM product_images
            WHERE product_id = :product_id
            '
        );

        $delete->execute([
            'product_id' => $productId,
        ]);

        $insert = $this->pdo->prepare(
            '
            INSERT INTO product_images (
                product_id,
                image_url,
                alt_text,
                is_primary,
                sort_order
            ) VALUES (
                :product_id,
                :image_url,
                :alt_text,
                :is_primary,
                :sort_order
            )
            '
        );

        foreach ($images as $image) {
            $insert->execute([
                'product_id' => $productId,
                'image_url' => $image['image_url'],
                'alt_text' => $image['alt_text'],
                'is_primary' => $image['is_primary'],
                'sort_order' => $image['sort_order'],
            ]);
        }
    }

    private function replaceSpecifications(
        int $productId,
        array $specifications
    ): void {
        $delete = $this->pdo->prepare(
            '
            DELETE FROM product_specifications
            WHERE product_id = :product_id
            '
        );

        $delete->execute([
            'product_id' => $productId,
        ]);

        $insert = $this->pdo->prepare(
            '
            INSERT INTO product_specifications (
                product_id,
                specification_name,
                specification_value,
                sort_order
            ) VALUES (
                :product_id,
                :specification_name,
                :specification_value,
                :sort_order
            )
            '
        );

        foreach ($specifications as $specification) {
            $insert->execute([
                'product_id' =>
                    $productId,

                'specification_name' =>
                    $specification['specification_name'],

                'specification_value' =>
                    $specification['specification_value'],

                'sort_order' =>
                    $specification['sort_order'],
            ]);
        }
    }
}