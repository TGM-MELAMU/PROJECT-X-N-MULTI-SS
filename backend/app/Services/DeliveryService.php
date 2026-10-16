<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Contracts\DistanceProviderInterface;
use MultiSS\Integrations\ProviderFactory;
use MultiSS\Repositories\DeliveryRepository;
use OutOfBoundsException;
use RuntimeException;

final class DeliveryService
{
    private DeliveryRepository $delivery;

    private DistanceProviderInterface
        $distanceProvider;

    public function __construct(
        ?DeliveryRepository $delivery = null,
        ?DistanceProviderInterface $distanceProvider = null,
        ?array $config = null
    ) {
        $this->delivery =
            $delivery
            ?? new DeliveryRepository();

        $config =
            $config
            ?? require __DIR__
                . '/../../config/delivery.php';

        if ($distanceProvider !== null) {
            $this->distanceProvider =
                $distanceProvider;

            return;
        }

        $this->distanceProvider = ProviderFactory::distance($config);
    }

    public function options(): array
    {
        $collection =
            $this->delivery
                ->findActiveCollectionLocation();

        return [
            'fulfillment_methods' => [
                'delivery',
                'collection',
            ],

            'delivery_methods' => [
                'standard',
                'express',
            ],

            'collection_location' =>
                $collection !== null
                    ? $this->formatCollection(
                        $collection
                    )
                    : null,
        ];
    }

    public function quote(
        int $userId,
        array $data
    ): array {
        $fulfillmentMethod =
            strtolower(
                trim(
                    (string) (
                        $data[
                            'fulfillment_method'
                        ]
                        ?? ''
                    )
                )
            );

        if (
            !in_array(
                $fulfillmentMethod,
                [
                    'delivery',
                    'collection',
                ],
                true
            )
        ) {
            throw new InvalidArgumentException(
                'Fulfillment method must be delivery or collection.'
            );
        }

        if (
            $fulfillmentMethod
            === 'collection'
        ) {
            return $this->collectionQuote();
        }

        return $this->deliveryQuote(
            $userId,
            $data
        );
    }

    private function deliveryQuote(
        int $userId,
        array $data
    ): array {
        $addressId =
            $this->positiveInt(
                $data['address_id'] ?? null,
                'Address ID'
            );

        $deliveryMethod =
            strtolower(
                trim(
                    (string) (
                        $data[
                            'delivery_method'
                        ]
                        ?? ''
                    )
                )
            );

        if (
            !in_array(
                $deliveryMethod,
                [
                    'standard',
                    'express',
                ],
                true
            )
        ) {
            throw new InvalidArgumentException(
                'Delivery method must be standard or express.'
            );
        }

        $address =
            $this->delivery
                ->findOwnedAddress(
                    $userId,
                    $addressId
                );

        if ($address === null) {
            throw new OutOfBoundsException(
                'Address not found.'
            );
        }

        $distanceKm =
            round(
                $this->distanceProvider
                    ->distanceKm(
                        $address
                    ),
                2
            );

        $rate =
            $this->delivery
                ->findRate(
                    $deliveryMethod,
                    $distanceKm
                );

        if ($rate === null) {
            throw new DomainException(
                'Delivery is not available for this distance.'
            );
        }

        return [
            'fulfillment_method' =>
                'delivery',

            'delivery_method' =>
                $deliveryMethod,

            'address_id' =>
                $addressId,

            'delivery_rate_id' =>
                (int) $rate[
                    'delivery_rate_id'
                ],

            'calculated_distance_km' =>
                $distanceKm,

            'delivery_fee' =>
                (float) $rate['price'],

            'collection_location' =>
                null,
        ];
    }

    private function collectionQuote(): array
    {
        $location =
            $this->delivery
                ->findActiveCollectionLocation();

        if ($location === null) {
            throw new DomainException(
                'Collection is currently unavailable.'
            );
        }

        return [
            'fulfillment_method' =>
                'collection',

            'delivery_method' =>
                null,

            'address_id' =>
                null,

            'delivery_rate_id' =>
                null,

            'calculated_distance_km' =>
                null,

            'delivery_fee' =>
                0.00,

            'collection_location' =>
                $this->formatCollection(
                    $location
                ),
        ];
    }

    private function formatCollection(
        array $location
    ): array {
        return [
            'collection_location_id' =>
                (int) $location[
                    'collection_location_id'
                ],

            'location_name' =>
                (string) $location[
                    'location_name'
                ],

            'contact_number' =>
                $location[
                    'contact_number'
                ],

            'address_line_1' =>
                (string) $location[
                    'address_line_1'
                ],

            'address_line_2' =>
                $location[
                    'address_line_2'
                ],

            'city' =>
                (string) $location[
                    'city'
                ],

            'province' =>
                (string) $location[
                    'province'
                ],

            'postal_code' =>
                (string) $location[
                    'postal_code'
                ],

            'country' =>
                (string) $location[
                    'country'
                ],
        ];
    }

    private function positiveInt(
        mixed $value,
        string $field
    ): int {
        $validated =
            filter_var(
                $value,
                FILTER_VALIDATE_INT,
                [
                    'options' => [
                        'min_range' => 1,
                    ],
                ]
            );

        if ($validated === false) {
            throw new InvalidArgumentException(
                $field
                . ' must be a positive integer.'
            );
        }

        return (int) $validated;
    }
}