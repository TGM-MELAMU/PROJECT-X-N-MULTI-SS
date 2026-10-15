<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class UserTokenRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function create(
        int $userId,
        string $tokenType,
        string $tokenHash,
        string $expiresAt
    ): int {
        $statement = $this->pdo->prepare(
            'INSERT INTO user_tokens (
                user_id,
                token_type,
                token_hash,
                expires_at
            ) VALUES (
                :user_id,
                :token_type,
                :token_hash,
                :expires_at
            )'
        );

        $statement->execute([
            'user_id' => $userId,
            'token_type' => $tokenType,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findValidByHashAndType(
        string $tokenHash,
        string $tokenType
    ): ?array {
        $statement = $this->pdo->prepare(
            'SELECT
                token_id,
                user_id,
                token_type,
                token_hash,
                expires_at,
                used_at,
                created_at
             FROM user_tokens
             WHERE token_hash = :token_hash
               AND token_type = :token_type
               AND used_at IS NULL
               AND expires_at > CURRENT_TIMESTAMP
             LIMIT 1'
        );

        $statement->execute([
            'token_hash' => $tokenHash,
            'token_type' => $tokenType,
        ]);

        $token = $statement->fetch(PDO::FETCH_ASSOC);

        return $token !== false ? $token : null;
    }

    public function markUsed(int $tokenId): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE user_tokens
             SET used_at = CURRENT_TIMESTAMP
             WHERE token_id = :token_id
               AND used_at IS NULL'
        );

        $statement->execute([
            'token_id' => $tokenId,
        ]);
    }

    public function invalidateUnusedForUserAndType(
        int $userId,
        string $tokenType
    ): void {
        $statement = $this->pdo->prepare(
            'UPDATE user_tokens
             SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = :user_id
               AND token_type = :token_type
               AND used_at IS NULL'
        );

        $statement->execute([
            'user_id' => $userId,
            'token_type' => $tokenType,
        ]);
    }
public function findValidByHashAndTypeForUpdate(
    string $tokenHash,
    string $tokenType
): ?array {
    $statement = $this->pdo->prepare(
        'SELECT *
         FROM user_tokens
         WHERE token_hash = :token_hash
           AND token_type = :token_type
           AND used_at IS NULL
           AND expires_at > CURRENT_TIMESTAMP
         LIMIT 1
         FOR UPDATE'
    );

    $statement->execute([
        'token_hash' => $tokenHash,
        'token_type' => $tokenType,
    ]);

    $token = $statement->fetch();

    return $token === false
        ? null
        : $token;
   }
}