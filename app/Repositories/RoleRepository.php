<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class RoleRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function findByName(string $roleName): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT
                role_id,
                role_name,
                description
             FROM roles
             WHERE role_name = :role_name
             LIMIT 1'
        );

        $statement->execute([
            'role_name' => $roleName,
        ]);

        $role = $statement->fetch(PDO::FETCH_ASSOC);

        return $role !== false ? $role : null;
    }

    public function assignToUser(
        int $userId,
        int $roleId
    ): void {
        $statement = $this->pdo->prepare(
            'INSERT INTO user_roles (
                user_id,
                role_id
            ) VALUES (
                :user_id,
                :role_id
            )'
        );

        $statement->execute([
            'user_id' => $userId,
            'role_id' => $roleId,
        ]);
    }

    public function userHasRole(
        int $userId,
        string $roleName
    ): bool {
        $statement = $this->pdo->prepare(
            'SELECT 1
             FROM user_roles ur
             INNER JOIN roles r
                ON r.role_id = ur.role_id
             WHERE ur.user_id = :user_id
               AND r.role_name = :role_name
             LIMIT 1'
        );

        $statement->execute([
            'user_id' => $userId,
            'role_name' => $roleName,
        ]);

        return $statement->fetchColumn() !== false;
    }
}