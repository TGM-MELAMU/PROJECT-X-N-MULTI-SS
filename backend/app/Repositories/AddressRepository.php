<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;
use Throwable;

final class AddressRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function findByUserId(
        int $userId
    ): array {
        $statement = $this->pdo->prepare(
            '
            SELECT
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
            ORDER BY
                is_default DESC,
                created_at ASC,
                address_id ASC
            '
        );

        $statement->execute([
            'user_id' => $userId,
        ]);

        return $statement->fetchAll();
    }

    public function findByIdForUser(
        int $addressId,
        int $userId
    ): ?array {
        $statement = $this->pdo->prepare(
            '
            SELECT
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
            WHERE
                address_id = :address_id
                AND user_id = :user_id
            LIMIT 1
            '
        );

        $statement->execute([
            'address_id' => $addressId,
            'user_id' => $userId,
        ]);

        $address = $statement->fetch();

        return $address === false
            ? null
            : $address;
    }

    public function countByUserId(
        int $userId
    ): int {
        $statement = $this->pdo->prepare(
            '
            SELECT COUNT(*)
            FROM addresses
            WHERE user_id = :user_id
            '
        );

        $statement->execute([
            'user_id' => $userId,
        ]);

        return (int) $statement->fetchColumn();
    }

    public function create(
        int $userId,
        ?string $addressLabel,
        string $addressLine1,
        ?string $addressLine2,
        string $city,
        string $province,
        string $postalCode,
        string $country,
        bool $isDefault
    ): int {
        $ownsTransaction =
            !$this->pdo->inTransaction();

        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            if ($isDefault) {
                $clearDefault = $this->pdo->prepare(
                    '
                    UPDATE addresses
                    SET is_default = 0
                    WHERE user_id = :user_id
                    '
                );

                $clearDefault->execute([
                    'user_id' => $userId,
                ]);
            }

            $statement = $this->pdo->prepare(
                '
                INSERT INTO addresses (
                    user_id,
                    address_label,
                    address_line_1,
                    address_line_2,
                    city,
                    province,
                    postal_code,
                    country,
                    is_default
                )
                VALUES (
                    :user_id,
                    :address_label,
                    :address_line_1,
                    :address_line_2,
                    :city,
                    :province,
                    :postal_code,
                    :country,
                    :is_default
                )
                '
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
                'is_default' =>
                    $isDefault ? 1 : 0,
            ]);

            $addressId =
                (int) $this->pdo->lastInsertId();

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return $addressId;
        } catch (Throwable $exception) {
            if (
                $ownsTransaction
                && $this->pdo->inTransaction()
            ) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }
}
