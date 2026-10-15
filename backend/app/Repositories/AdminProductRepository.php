<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class AdminProductRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo =
            $pdo ?? Database::connection();
    }

    public function findPendingProducts(): array
    {
        $statement = $this->pdo->prepare(
            '
            SELECT
                p.product_id,
                p.vendor_id,
                p.product_name,
                p.slug,
                p.description,
                p.brand,
                p.product_status,
                p.approval_status,
                p.created_at,
                p.updated_at,
                v.institution_company_name AS vendor_name

            FROM products p

            INNER JOIN vendors v
                ON v.vendor_id = p.vendor_id

            WHERE
                p.approval_status = \'pending\'

            ORDER BY
                p.updated_at ASC,
                p.product_id ASC
            '
        );

        $statement->execute();

        return $statement->fetchAll();
    }

    public function findById(
        int $productId
    ): ?array {
        $statement = $this->pdo->prepare(
            '
            SELECT
                p.product_id,
                p.vendor_id,
                p.product_name,
                p.slug,
                p.description,
                p.brand,
                p.product_status,
                p.approval_status,
                p.reviewed_by,
                p.reviewed_at,
                p.rejection_reason,
                p.created_at,
                p.updated_at,
                v.institution_company_name AS vendor_name

            FROM products p

            INNER JOIN vendors v
                ON v.vendor_id = p.vendor_id

            WHERE
                p.product_id = :product_id

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

    public function approve(
        int $productId,
        int $reviewerId
    ): void {
        $statement = $this->pdo->prepare(
            '
            UPDATE products

            SET
                product_status = \'active\',
                approval_status = \'approved\',
                reviewed_by = :reviewed_by,
                reviewed_at = CURRENT_TIMESTAMP,
                rejection_reason = NULL,
                updated_at = CURRENT_TIMESTAMP

            WHERE
                product_id = :product_id
            '
        );

        $statement->execute([
            'reviewed_by' => $reviewerId,
            'product_id' => $productId,
        ]);
    }

    public function reject(
        int $productId,
        int $reviewerId,
        string $reason
    ): void {
        $statement = $this->pdo->prepare(
            '
            UPDATE products

            SET
                product_status = \'draft\',
                approval_status = \'rejected\',
                reviewed_by = :reviewed_by,
                reviewed_at = CURRENT_TIMESTAMP,
                rejection_reason = :rejection_reason,
                updated_at = CURRENT_TIMESTAMP

            WHERE
                product_id = :product_id
            '
        );

        $statement->execute([
            'reviewed_by' => $reviewerId,
            'rejection_reason' => $reason,
            'product_id' => $productId,
        ]);
    }
}