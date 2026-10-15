<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;
use RuntimeException;
use OutOfBoundsException;
use InvalidArgumentException;

final class AdminInventoryRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function listing(int $limit, int $offset, bool $lowStock): array
    {
        $filter = $lowStock ? ' WHERE COALESCE(i.quantity_in_stock, 0) <= COALESCE(i.reorder_level, 0)' : '';
        $from = ' FROM product_variants pv
                  JOIN products p ON p.product_id = pv.product_id
                  JOIN vendors v ON v.vendor_id = p.vendor_id
                  LEFT JOIN inventory i ON i.variant_id = pv.variant_id ' . $filter;
        $total = (int) $this->pdo->query('SELECT COUNT(*) ' . $from)->fetchColumn();
        $stmt = $this->pdo->prepare(
            'SELECT pv.variant_id, pv.product_id, pv.sku, pv.variant_name, pv.variant_status,
                    p.product_name, p.product_status, p.approval_status,
                    p.vendor_id, v.institution_company_name AS vendor_name,
                    COALESCE(i.quantity_in_stock, 0) AS quantity_in_stock,
                    COALESCE(i.reorder_level, 0) AS reorder_level'
            . $from . ' ORDER BY pv.variant_id DESC LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return ['inventory' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'total' => $total];
    }

    public function item(int $variantId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT pv.variant_id, pv.product_id, pv.sku, pv.variant_name,
                    p.product_name, p.vendor_id,
                    COALESCE(i.quantity_in_stock, 0) AS quantity_in_stock,
                    COALESCE(i.reorder_level, 0) AS reorder_level
             FROM product_variants pv
             JOIN products p ON p.product_id = pv.product_id
             LEFT JOIN inventory i ON i.variant_id = pv.variant_id
             WHERE pv.variant_id = ? LIMIT 1'
        );
        $stmt->execute([$variantId]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        return $item === false ? null : $item;
    }

    public function movements(int $variantId, int $limit, int $offset): array
    {
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM inventory_movements WHERE variant_id = ?');
        $count->execute([$variantId]);
        $stmt = $this->pdo->prepare(
            'SELECT movement_id, variant_id, movement_type, quantity_change, previous_quantity,
                    new_quantity, performed_by, notes, created_at
             FROM inventory_movements WHERE variant_id = :id
             ORDER BY movement_id DESC LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':id', $variantId, PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return ['movements' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'total' => (int) $count->fetchColumn()];
    }

    public function adjust(int $variantId, int $adminId, string $type, int $change, ?string $notes, ?int $reorder): array
    {
        $this->pdo->beginTransaction();
        try {
            // Lock the variant first; serialize concurrent adjustments even if inventory row is absent.
            $lock = $this->pdo->prepare('SELECT variant_id FROM product_variants WHERE variant_id = ? FOR UPDATE');
            $lock->execute([$variantId]);
            if ($lock->fetchColumn() === false) {
                throw new OutOfBoundsException('Variant not found.');
            }
            $this->pdo->prepare(
                'INSERT IGNORE INTO inventory (variant_id, quantity_in_stock, reorder_level)
                 VALUES (?, 0, 0)'
            )->execute([$variantId]);
            $stmt = $this->pdo->prepare(
                'SELECT quantity_in_stock, reorder_level FROM inventory WHERE variant_id = ? FOR UPDATE'
            );
            $stmt->execute([$variantId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($item === false) {
                throw new RuntimeException('Unable to lock inventory.');
            }
            $before = (int) $item['quantity_in_stock'];
            $after = $before + $change;
            if ($after < 0 || $after > 2147483647) {
                throw new InvalidArgumentException('Stock cannot be negative or exceed supported range.');
            }
            $level = $reorder ?? (int) $item['reorder_level'];
            $this->pdo->prepare(
                'UPDATE inventory SET quantity_in_stock = ?, reorder_level = ? WHERE variant_id = ?'
            )->execute([$after, $level, $variantId]);
            $this->pdo->prepare(
                'INSERT INTO inventory_movements
                 (variant_id, movement_type, quantity_change, previous_quantity,
                  new_quantity, performed_by, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([$variantId, $type, $change, $before, $after, $adminId, $notes]);
            $this->pdo->commit();
            return ['variant_id' => $variantId, 'previous_quantity' => $before,
                    'quantity_change' => $change, 'new_quantity' => $after,
                    'reorder_level' => $level, 'movement_type' => $type];
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }
}
