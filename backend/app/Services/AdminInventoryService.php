<?php

declare(strict_types=1);

namespace MultiSS\Services;

use InvalidArgumentException;
use MultiSS\Repositories\AdminInventoryRepository;
use OutOfBoundsException;

final class AdminInventoryService
{
    private AdminInventoryRepository $repo;

    public function __construct(?AdminInventoryRepository $repo = null)
    {
        $this->repo = $repo ?? new AdminInventoryRepository();
    }

    public function listing(array $query): array
    {
        [$page, $limit] = $this->pagination($query);
        $low = $query['low_stock'] ?? '0';
        if (!in_array($low, ['0', '1', 0, 1], true)) {
            throw new InvalidArgumentException('low_stock must be 0 or 1.');
        }
        return $this->repo->listing($limit, ($page - 1) * $limit, (string) $low === '1')
            + ['page' => $page, 'limit' => $limit];
    }

    public function item(int $id): array
    {
        $item = $this->repo->item($this->positive($id, 'variant_id'));
        if ($item === null) {
            throw new OutOfBoundsException('Variant not found.');
        }
        return ['item' => $item];
    }

    public function movements(int $id, array $query): array
    {
        $this->item($id);
        [$page, $limit] = $this->pagination($query);
        return $this->repo->movements($id, $limit, ($page - 1) * $limit)
            + ['page' => $page, 'limit' => $limit];
    }

    public function adjust(int $variantId, array $admin, array $data): array
    {
        $id = $this->positive($variantId, 'variant_id');
        $adminId = $this->positive($admin['user_id'] ?? null, 'administrator user_id');
        $type = $data['movement_type'] ?? null;
        // Sale and return are owned by checkout/refund processes, not manual admin adjustments.
        if (!is_string($type) || !in_array($type, ['stock_in', 'damage', 'adjustment'], true)) {
            throw new InvalidArgumentException('movement_type must be stock_in, damage or adjustment.');
        }
        $change = filter_var($data['quantity_change'] ?? null, FILTER_VALIDATE_INT);
        if ($change === false || $change === null || $change === 0 || abs($change) > 1000000) {
            throw new InvalidArgumentException('quantity_change must be a non-zero integer between -1000000 and 1000000.');
        }
        if (($type === 'stock_in' && $change <= 0) || ($type === 'damage' && $change >= 0)) {
            throw new InvalidArgumentException('stock_in must increase stock; damage must decrease it.');
        }
        $notes = $data['notes'] ?? null;
        if ($notes !== null && (!is_string($notes) || strlen(trim($notes)) > 255)) {
            throw new InvalidArgumentException('notes must be at most 255 characters.');
        }
        if ($type === 'adjustment' && (!is_string($notes) || trim($notes) === '')) {
            throw new InvalidArgumentException('A reason is required for manual adjustments.');
        }
        $reorder = null;
        if (array_key_exists('reorder_level', $data)) {
            $reorder = filter_var($data['reorder_level'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 2147483647]]);
            if ($reorder === false) {
                throw new InvalidArgumentException('reorder_level must be a non-negative integer.');
            }
        }
        return ['adjustment' => $this->repo->adjust($id, $adminId, $type, (int) $change,
            $notes === null ? null : trim($notes), $reorder)];
    }

    private function pagination(array $query): array
    {
        $page = $this->positive($query['page'] ?? 1, 'page');
        $limit = $this->positive($query['limit'] ?? 25, 'limit');
        if ($limit > 100 || $page > 100000) {
            throw new InvalidArgumentException('Pagination is out of range.');
        }
        return [$page, $limit];
    }

    private function positive(mixed $value, string $name): int
    {
        $int = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($int === false) {
            throw new InvalidArgumentException($name . ' must be a positive integer.');
        }
        return (int) $int;
    }
}
