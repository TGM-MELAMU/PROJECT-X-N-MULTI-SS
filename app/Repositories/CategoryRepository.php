<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;

final class CategoryRepository
{
    public function findPublicCategories(): array
    {
        $pdo = Database::connection();

        $sql = '
            SELECT
                c.category_id,
                c.parent_category_id,
                c.category_name,
                c.slug,
                c.description,

                COUNT(
                    DISTINCT CASE
                        WHEN
                            p.product_status = \'active\'
                            AND p.approval_status = \'approved\'
                            AND v.vendor_status = \'active\'
                            AND EXISTS (
                                SELECT 1
                                FROM product_variants pv
                                WHERE
                                    pv.product_id = p.product_id
                                    AND pv.variant_status = \'active\'
                            )
                        THEN p.product_id
                    END
                ) AS product_count

            FROM categories c

            LEFT JOIN product_categories pc
                ON pc.category_id = c.category_id

            LEFT JOIN products p
                ON p.product_id = pc.product_id

            LEFT JOIN vendors v
                ON v.vendor_id = p.vendor_id

            WHERE
                c.status = \'active\'

            GROUP BY
                c.category_id,
                c.parent_category_id,
                c.category_name,
                c.slug,
                c.description

            ORDER BY
                c.parent_category_id IS NOT NULL,
                c.parent_category_id,
                c.category_name
        ';

        $statement = $pdo->prepare($sql);

        $statement->execute();

        return $statement->fetchAll();
    }
}
