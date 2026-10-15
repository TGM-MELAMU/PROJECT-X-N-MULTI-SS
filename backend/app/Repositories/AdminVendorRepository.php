<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class AdminVendorRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function listing(int $limit, int $offset, ?string $status): array
    {
        $where = $status === null ? '' : ' WHERE vendor_status = :status';
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM vendors' . $where);
        if ($status !== null) {
            $count->bindValue(':status', $status);
        }
        $count->execute();
        $stmt = $this->pdo->prepare(
            'SELECT vendor_id, vendor_type, institution_company_name, email_address,
                    vendor_status, application_id, created_at, updated_at
             FROM vendors' . $where . ' ORDER BY vendor_id DESC LIMIT :lim OFFSET :off'
        );
        if ($status !== null) {
            $stmt->bindValue(':status', $status);
        }
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return ['vendors' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'total' => (int) $count->fetchColumn()];
    }

    public function vendor(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT vendor_id, application_id, vendor_type, institution_company_name,
                    registration_number, vat_number, email_address,
                    primary_contact_number, billing_city, billing_province,
                    vendor_status, created_at, updated_at
             FROM vendors WHERE vendor_id = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        return $item === false ? null : $item;
    }

    public function status(int $id, string $status): void
    {
        $stmt = $this->pdo->prepare(
            "UPDATE vendors SET vendor_status = :status
             WHERE vendor_id = :id AND vendor_type = 'third_party'"
        );
        $stmt->execute(['status' => $status, 'id' => $id]);
    }
}
