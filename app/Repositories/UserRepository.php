<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class UserRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function findByEmail(string $email): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT
                user_id,
                first_name,
                last_name,
                email,
                phone,
                password_hash,
                status,
                email_verified_at,
                created_at,
                updated_at
             FROM users
             WHERE email = :email
             LIMIT 1'
        );

        $statement->execute([
            'email' => $email,
        ]);

        $user = $statement->fetch(PDO::FETCH_ASSOC);

        return $user !== false ? $user : null;
    }

    public function findById(int $userId): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT
                user_id,
                first_name,
                last_name,
                email,
                phone,
                password_hash,
                status,
                email_verified_at,
                created_at,
                updated_at
             FROM users
             WHERE user_id = :user_id
             LIMIT 1'
        );

        $statement->execute([
            'user_id' => $userId,
        ]);

        $user = $statement->fetch(PDO::FETCH_ASSOC);

        return $user !== false ? $user : null;
    }

public function markEmailVerified(int $userId): void
{
    $statement = $this->pdo->prepare(
        'UPDATE users
         SET email_verified_at = CURRENT_TIMESTAMP
         WHERE user_id = :user_id
           AND email_verified_at IS NULL'
    );

    $statement->execute([
        'user_id' => $userId,
    ]);
}

    public function create(
        string $firstName,
        string $lastName,
        string $email,
        ?string $phone,
        string $passwordHash
    ): int {
        $statement = $this->pdo->prepare(
            'INSERT INTO users (
                first_name,
                last_name,
                email,
                phone,
                password_hash,
                status,
                email_verified_at
            ) VALUES (
                :first_name,
                :last_name,
                :email,
                :phone,
                :password_hash,
                :status,
                NULL
            )'
        );

        $statement->execute([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => $passwordHash,
            'status' => 'active',
        ]);

        return (int) $this->pdo->lastInsertId();
    }

public function updatePasswordHash(
    int $userId,
    string $passwordHash
): void {
    $statement = $this->pdo->prepare(
        'UPDATE users
         SET password_hash = :password_hash
         WHERE user_id = :user_id'
    );

    $statement->execute([
        'password_hash' => $passwordHash,
        'user_id' => $userId,
    ]);
  }
}