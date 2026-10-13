<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class AddressRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function findByUserId(int $userId): array
    {
        $statement = $this->pdo->prepare(
            'SELECT
                address_id,
                user_id,
                address_label,
                address_line_1,
                address_line_2,
                city,
                province,
                postal_code,
                country,
                is_default,
                created_at,
                updated_at
             FROM addresses
             WHERE user_id = :user_id
             ORDER BY is_default DESC, created_at ASC'
        );

        $statement->execute([
            'user_id' => $userId,
        ]);

        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(
        int $userId,
        ?string $addressLabel,
        string $addressLine1,
        ?string $addressLine2,
        string $city,
        string $province,
        string $postalCode,
        string $country = 'South Africa',
        bool $isDefault = false
    ): int {
        $statement = $this->pdo->prepare(
            'INSERT INTO addresses (
                user_id,
                address_label,
                address_line_1,
                address_line_2,
                city,
                province,
                postal_code,
                country,
                is_default
            ) VALUES (
                :user_id,
                :address_label,
                :address_line_1,
                :address_line_2,
                :city,
                :province,
                :postal_code,
                :country,
                :is_default
            )'
        );

        $statement->execute([
            'user_id' => $userId,
            'address_label' => $addressLabel,
            'address_line_1' => $addressLine1,
            'address_line_2' => $addressLine2,
            'city' => $city,
            'province' => $province,
            'postal_code' => $postalCode,
            'country' => $country,
            'is_default' => $isDefault ? 1 : 0,
        ]);

        return (int) $this->pdo->lastInsertId();
    }
}