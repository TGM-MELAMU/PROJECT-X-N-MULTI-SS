<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class DeliveryRepository
{
    private PDO $pdo;

    public function __construct(
        ?PDO $pdo = null
    ) {
        $this->pdo =
            $pdo ?? Database::connection();
    }

    public function findOwnedAddress(
        int $userId,
        int $addressId
    ): ?array {
        $statement =
            $this->pdo->prepare(
                '
                SELECT
                    address_id,
                    address_line_1,
                    address_line_2,
                    city,
                    province,
                    postal_code,
                    country
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

    public function findRate(
        string $deliveryMethod,
        float $distanceKm
    ): ?array {
        $statement =
            $this->pdo->prepare(
                '
                SELECT
                    delivery_rate_id,
                    delivery_method,
                    min_distance_km,
                    max_distance_km,
                    price

                FROM delivery_rate_brackets

                WHERE
                    delivery_method =
                        :delivery_method
                    AND status = \'active\'
                    AND min_distance_km <=
                        :distance_min
                    AND (
                        max_distance_km IS NULL
                        OR max_distance_km >=
                            :distance_max
                    )

                ORDER BY
                    min_distance_km DESC,
                    delivery_rate_id ASC

                LIMIT 1
                '
            );

        $statement->execute([
            'delivery_method' =>
                $deliveryMethod,

            'distance_min' =>
                $distanceKm,

            'distance_max' =>
                $distanceKm,
        ]);

        $rate = $statement->fetch();

        return $rate === false
            ? null
            : $rate;
    }

    public function findActiveCollectionLocation():
        ?array
    {
        $statement =
            $this->pdo->query(
                '
                SELECT
                    collection_location_id,
                    location_name,
                    contact_number,
                    address_line_1,
                    address_line_2,
                    city,
                    province,
                    postal_code,
                    country

                FROM collection_locations

                WHERE status = \'active\'

                ORDER BY
                    collection_location_id ASC

                LIMIT 1
                '
            );

        $location = $statement->fetch();

        return $location === false
            ? null
            : $location;
    }
}