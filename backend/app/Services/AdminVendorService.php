<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Repositories\AdminVendorRepository;
use OutOfBoundsException;

final class AdminVendorService
{
    private AdminVendorRepository $repo;

    public function __construct(?AdminVendorRepository $repo = null)
    {
        $this->repo = $repo ?? new AdminVendorRepository();
    }

    public function listing(array $query): array
    {
        $page = $this->positive($query['page'] ?? 1, 'page');
        $limit = $this->positive($query['limit'] ?? 25, 'limit');
        if ($page > 100000 || $limit > 100) {
            throw new InvalidArgumentException('Pagination is out of range.');
        }
        $status = $query['status'] ?? null;
        if ($status !== null && (!is_string($status) || !in_array($status, ['active','suspended','inactive'], true))) {
            throw new InvalidArgumentException('Invalid vendor status filter.');
        }
        return $this->repo->listing($limit, ($page - 1) * $limit, $status)
            + ['page' => $page, 'limit' => $limit];
    }

    public function vendor(int $id): array
    {
        $vendor = $this->repo->vendor($this->positive($id, 'vendor_id'));
        if ($vendor === null) {
            throw new OutOfBoundsException('Vendor not found.');
        }
        return ['vendor' => $vendor];
    }

    public function status(int $id, array $data): array
    {
        $vendor = $this->vendor($id)['vendor'];
        $status = $data['status'] ?? null;
        if (!is_string($status) || !in_array($status, ['active','suspended','inactive'], true)) {
            throw new InvalidArgumentException('status must be active, suspended or inactive.');
        }
        if ($vendor['vendor_type'] === 'multiss') {
            throw new DomainException('The MultiSS platform vendor cannot be changed here.');
        }
        $this->repo->status($id, $status);
        if ($vendor['vendor_status'] !== $status) {
            try {
                $alerts = new NotificationService();
                $target = new \MultiSS\Repositories\NotificationRepository();
                foreach ($target->vendorManagers($id) as $recipient) {
                    $alerts->notify($recipient, 'vendor:' . $id . ':status:' . bin2hex(random_bytes(8)),
                        'vendor_status_changed', ['company'=>$vendor['institution_company_name'], 'status'=>$status]);
                }
            } catch (\Throwable $error) {
                \MultiSS\Core\Logger::error('Unable to alert vendor about status', ['type'=>$error::class]);
            }
        }
        return $this->vendor($id);
    }

    private function positive(mixed $value, string $field): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            throw new InvalidArgumentException($field . ' must be positive.');
        }
        return (int) $id;
    }
}
