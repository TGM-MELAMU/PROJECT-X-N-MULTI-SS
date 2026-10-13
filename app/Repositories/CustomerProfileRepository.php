<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class CustomerProfileRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function findByUserId(int $userId): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT
                customer_profile_id,
                user_id,
                institution_company_name,
                vat_number,
                created_at,
                updated_at
             FROM customer_profiles
             WHERE user_id = :user_id
             LIMIT 1'
        );

        $statement->execute([
            'user_id' => $userId,
        ]);

        $profile = $statement->fetch(PDO::FETCH_ASSOC);

        return $profile !== false ? $profile : null;
    }

    public function create(
        int $userId,
        string $institutionCompanyName,
        string $vatNumber
    ): int {
        $statement = $this->pdo->prepare(
            'INSERT INTO customer_profiles (
                user_id,
                institution_company_name,
                vat_number
            ) VALUES (
                :user_id,
                :institution_company_name,
                :vat_number
            )'
        );

        $statement->execute([
            'user_id' => $userId,
            'institution_company_name' => $institutionCompanyName,
            'vat_number' => $vatNumber,
        ]);

        return (int) $this->pdo->lastInsertId();
    }
}