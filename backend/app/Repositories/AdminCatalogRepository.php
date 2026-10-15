<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class AdminCatalogRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function products(int $limit, int $offset, ?string $approval, ?string $status, ?int $vendorId): array
    {
        $clauses = [];
        $params = [];
        if ($approval !== null) {
            $clauses[] = 'p.approval_status = :approval';
            $params['approval'] = $approval;
        }
        if ($status !== null) {
            $clauses[] = 'p.product_status = :status';
            $params['status'] = $status;
        }
        if ($vendorId !== null) {
            $clauses[] = 'p.vendor_id = :vendor';
            $params['vendor'] = $vendorId;
        }
        $where = $clauses === [] ? '' : ' WHERE ' . implode(' AND ', $clauses);
        $sql = ' FROM products p JOIN vendors v ON v.vendor_id = p.vendor_id ' . $where;
        $count = $this->pdo->prepare('SELECT COUNT(*) ' . $sql);
        $count->execute($params);
        $total = (int) $count->fetchColumn();
        $stmt = $this->pdo->prepare(
            'SELECT p.product_id, p.vendor_id, v.institution_company_name AS vendor_name,
                    p.product_name, p.slug, p.brand, p.product_status, p.approval_status,
                    p.reviewed_by, p.reviewed_at, p.rejection_reason, p.created_at, p.updated_at'
            . $sql . ' ORDER BY p.product_id DESC LIMIT :lim OFFSET :off'
        );
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return ['products' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'total' => $total];
    }

    public function product(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.*, v.institution_company_name AS vendor_name
             FROM products p JOIN vendors v ON v.vendor_id = p.vendor_id
             WHERE p.product_id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        return $item === false ? null : $item;
    }

    public function updateProductStatus(int $id, string $status): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE products SET product_status = :status, updated_at = CURRENT_TIMESTAMP
             WHERE product_id = :id AND approval_status = 'approved'"
        );
        $stmt->execute(['id' => $id, 'status' => $status]);
        return $stmt->rowCount() > 0;
    }

    public function categories(): array
    {
        return $this->pdo->query(
            'SELECT c.category_id, c.parent_category_id, c.category_name, c.slug,
                    c.description, c.status, c.created_at, c.updated_at,
                    (SELECT COUNT(*) FROM product_categories pc
                     WHERE pc.category_id = c.category_id) AS product_count
             FROM categories c ORDER BY c.category_name ASC, c.category_id ASC'
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    public function category(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT category_id, parent_category_id, category_name, slug, description, status
             FROM categories WHERE category_id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        return $item === false ? null : $item;
    }

    public function slugTaken(string $slug, ?int $except = null): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM categories WHERE slug = :slug
             AND (:except_id IS NULL OR category_id <> :other_id)'
        );
        $stmt->execute(['slug' => $slug, 'except_id' => $except, 'other_id' => $except]);
        return (int) $stmt->fetchColumn() > 0;
    }

    public function createCategory(string $name, string $slug, ?string $description, ?int $parent): int
    {
        $stmt = $this->pdo->prepare(
            "INSERT INTO categories (category_name, slug, description, parent_category_id, status)
             VALUES (:name, :slug, :description, :parent, 'active')"
        );
        $stmt->execute(['name' => $name, 'slug' => $slug, 'description' => $description, 'parent' => $parent]);
        return (int) $this->pdo->lastInsertId();
    }

    public function updateCategory(int $id, string $name, string $slug, ?string $description, ?int $parent, string $status): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE categories SET category_name = :name, slug = :slug, description = :description,
             parent_category_id = :parent, status = :status WHERE category_id = :id'
        );
        $stmt->execute(['name' => $name, 'slug' => $slug, 'description' => $description,
                        'parent' => $parent, 'status' => $status, 'id' => $id]);
    }

    public function replaceCategories(int $productId, array $ids): void
    {
        $this->pdo->beginTransaction();
        try {
            $lock = $this->pdo->prepare('SELECT product_id FROM products WHERE product_id = ? FOR UPDATE');
            $lock->execute([$productId]);
            if ($lock->fetchColumn() === false) {
                throw new \OutOfBoundsException('Product not found.');
            }
            if ($ids !== []) {
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $stmt = $this->pdo->prepare(
                    "SELECT COUNT(*) FROM categories WHERE status = 'active' AND category_id IN ($placeholders)"
                );
                $stmt->execute($ids);
                if ((int) $stmt->fetchColumn() !== count($ids)) {
                    throw new \InvalidArgumentException('All category IDs must be active categories.');
                }
            }
            $stmt = $this->pdo->prepare('DELETE FROM product_categories WHERE product_id = ?');
            $stmt->execute([$productId]);
            $insert = $this->pdo->prepare(
                'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)'
            );
            foreach ($ids as $id) {
                $insert->execute([$productId, $id]);
            }
            $this->pdo->commit();
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }
}
