<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;
use PDOStatement;

final class ProductRepository
{
    public function findPublicProducts(
        int $limit = 20,
        int $offset = 0,
        ?string $search = null,
        ?string $categorySlug = null,
        string $sort = 'newest'
    ): array {
        $pdo = Database::connection();

        [$whereSql, $parameters] =
            $this->buildPublicFilters(
                search: $search,
                categorySlug: $categorySlug
            );

        $orderBy = match ($sort) {
            'name_asc' =>
                'p.product_name ASC, p.product_id DESC',

            'name_desc' =>
                'p.product_name DESC, p.product_id DESC',

            'price_asc' =>
                'starting_price ASC, p.product_id DESC',

            'price_desc' =>
                'starting_price DESC, p.product_id DESC',

            default =>
                'p.product_id DESC',
        };

        $sql = '
            SELECT
                p.product_id,
                p.vendor_id,
                p.product_name,
                p.slug,
                p.description,
                p.brand,
                v.institution_company_name AS vendor_name,

                MIN(
                    pv.selling_price
                ) AS starting_price,

                MAX(
                    COALESCE(i.quantity_in_stock, 0)
                ) AS quantity_in_stock,

                (
                    SELECT
                        pi.image_url

                    FROM product_images pi

                    WHERE
                        pi.product_id = p.product_id

                    ORDER BY
                        pi.is_primary DESC,
                        pi.sort_order ASC,
                        pi.image_id ASC

                    LIMIT 1
                ) AS primary_image

            FROM products p

            INNER JOIN vendors v
                ON v.vendor_id = p.vendor_id

            INNER JOIN product_variants pv
                ON pv.product_id = p.product_id
                AND pv.variant_status = \'active\'

            LEFT JOIN inventory i
                ON i.variant_id = pv.variant_id

            WHERE
                ' . $whereSql . '

            GROUP BY
                p.product_id,
                p.vendor_id,
                p.product_name,
                p.slug,
                p.description,
                p.brand,
                v.institution_company_name

            ORDER BY
                ' . $orderBy . '

            LIMIT :limit
            OFFSET :offset
        ';

        $statement = $pdo->prepare($sql);

        $this->bindStringParameters(
            $statement,
            $parameters
        );

        $statement->bindValue(
            ':limit',
            $limit,
            PDO::PARAM_INT
        );

        $statement->bindValue(
            ':offset',
            $offset,
            PDO::PARAM_INT
        );

        $statement->execute();

        return $statement->fetchAll();
    }

    public function countPublicProducts(
        ?string $search = null,
        ?string $categorySlug = null
    ): int {
        $pdo = Database::connection();

        [$whereSql, $parameters] =
            $this->buildPublicFilters(
                search: $search,
                categorySlug: $categorySlug
            );

        $sql = '
            SELECT
                COUNT(DISTINCT p.product_id)

            FROM products p

            INNER JOIN vendors v
                ON v.vendor_id = p.vendor_id

            INNER JOIN product_variants pv
                ON pv.product_id = p.product_id
                AND pv.variant_status = \'active\'

            WHERE
                ' . $whereSql;

        $statement = $pdo->prepare($sql);

        $this->bindStringParameters(
            $statement,
            $parameters
        );

        $statement->execute();

        return (int) $statement->fetchColumn();
    }

    public function findPublicProductBySlug(
        string $slug
    ): ?array {
        $pdo = Database::connection();

        $sql = '
            SELECT
                p.product_id,
                p.vendor_id,
                p.product_name,
                p.slug,
                p.description,
                p.brand,
                v.institution_company_name AS vendor_name,

                MIN(
                    pv.selling_price
                ) AS starting_price,

                MAX(
                    COALESCE(i.quantity_in_stock, 0)
                ) AS quantity_in_stock,

                (
                    SELECT
                        pi.image_url

                    FROM product_images pi

                    WHERE
                        pi.product_id = p.product_id

                    ORDER BY
                        pi.is_primary DESC,
                        pi.sort_order ASC,
                        pi.image_id ASC

                    LIMIT 1
                ) AS primary_image

            FROM products p

            INNER JOIN vendors v
                ON v.vendor_id = p.vendor_id

            INNER JOIN product_variants pv
                ON pv.product_id = p.product_id
                AND pv.variant_status = \'active\'

            LEFT JOIN inventory i
                ON i.variant_id = pv.variant_id

            WHERE
                p.slug = :slug
                AND p.product_status = \'active\'
                AND p.approval_status = \'approved\'
                AND v.vendor_status = \'active\'

            GROUP BY
                p.product_id,
                p.vendor_id,
                p.product_name,
                p.slug,
                p.description,
                p.brand,
                v.institution_company_name

            LIMIT 1
        ';

        $statement = $pdo->prepare($sql);

        $statement->bindValue(
            ':slug',
            $slug,
            PDO::PARAM_STR
        );

        $statement->execute();

        $product = $statement->fetch();

        return $product === false
            ? null
            : $product;
    }

    public function findPublicVariantsByProductId(
        int $productId
    ): array {
        $pdo = Database::connection();

        $sql = '
            SELECT
                pv.variant_id,
                pv.variant_name,
                pv.sku,
                pv.model_number,
                pv.unit,
                pv.selling_price,

                COALESCE(
                    i.quantity_in_stock,
                    0
                ) AS quantity_in_stock

            FROM product_variants pv

            LEFT JOIN inventory i
                ON i.variant_id = pv.variant_id

            WHERE
                pv.product_id = :product_id
                AND pv.variant_status = \'active\'

            ORDER BY
                pv.variant_id ASC
        ';

        $statement = $pdo->prepare($sql);

        $statement->bindValue(
            ':product_id',
            $productId,
            PDO::PARAM_INT
        );

        $statement->execute();

        return $statement->fetchAll();
    }

    public function findProductImages(
        int $productId
    ): array {
        $pdo = Database::connection();

        $sql = '
            SELECT
                image_id,
                image_url,
                alt_text,
                is_primary,
                sort_order

            FROM product_images

            WHERE
                product_id = :product_id

            ORDER BY
                is_primary DESC,
                sort_order ASC,
                image_id ASC
        ';

        $statement = $pdo->prepare($sql);

        $statement->bindValue(
            ':product_id',
            $productId,
            PDO::PARAM_INT
        );

        $statement->execute();

        return $statement->fetchAll();
    }

    public function findProductSpecifications(
        int $productId
    ): array {
        $pdo = Database::connection();

        $sql = '
            SELECT
                specification_id,
                specification_name,
                specification_value,
                sort_order

            FROM product_specifications

            WHERE
                product_id = :product_id

            ORDER BY
                sort_order ASC,
                specification_id ASC
        ';

        $statement = $pdo->prepare($sql);

        $statement->bindValue(
            ':product_id',
            $productId,
            PDO::PARAM_INT
        );

        $statement->execute();

        return $statement->fetchAll();
    }

    private function buildPublicFilters(
        ?string $search,
        ?string $categorySlug
    ): array {
        $whereConditions = [
            'p.product_status = \'active\'',
            'p.approval_status = \'approved\'',
            'v.vendor_status = \'active\'',
        ];

        $parameters = [];

        if ($search !== null && $search !== '') {
            $whereConditions[] = '
                (
                    p.product_name LIKE :search_name
                    OR p.slug LIKE :search_slug
                    OR p.description LIKE :search_description
                    OR p.brand LIKE :search_brand
                )
            ';

            $searchValue =
                '%' . $search . '%';

            $parameters[':search_name'] =
                $searchValue;

            $parameters[':search_slug'] =
                $searchValue;

            $parameters[':search_description'] =
                $searchValue;

            $parameters[':search_brand'] =
                $searchValue;
        }

        if (
            $categorySlug !== null
            && $categorySlug !== ''
        ) {
            $whereConditions[] = '
                EXISTS (
                    SELECT 1

                    FROM product_categories pc

                    INNER JOIN categories c
                        ON c.category_id = pc.category_id

                    WHERE
                        pc.product_id = p.product_id
                        AND c.slug = :category_slug
                        AND c.status = \'active\'
                )
            ';

            $parameters[':category_slug'] =
                $categorySlug;
        }

        return [
            implode(
                ' AND ',
                $whereConditions
            ),
            $parameters,
        ];
    }

    private function bindStringParameters(
        PDOStatement $statement,
        array $parameters
    ): void {
        foreach ($parameters as $name => $value) {
            $statement->bindValue(
                $name,
                $value,
                PDO::PARAM_STR
            );
        }
    }
}