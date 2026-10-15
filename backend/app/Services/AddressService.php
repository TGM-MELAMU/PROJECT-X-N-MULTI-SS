<?php

declare(strict_types=1);

namespace MultiSS\Services;

use InvalidArgumentException;
use MultiSS\Repositories\AddressRepository;
use OutOfBoundsException;

final class AddressService
{
    private AddressRepository $addresses;

    public function __construct(
        ?AddressRepository $addresses = null
    ) {
        $this->addresses =
            $addresses ?? new AddressRepository();
    }

    public function getAddresses(
        int $userId
    ): array {
        $rows =
            $this->addresses->findByUserId(
                $userId
            );

        return array_map(
            fn (array $row): array =>
                $this->formatAddress($row),
            $rows
        );
    }

    public function getOwnedAddress(
        int $userId,
        int $addressId
    ): array {
        if ($addressId <= 0) {
            throw new InvalidArgumentException(
                'Invalid address ID.'
            );
        }

        $address =
            $this->addresses->findByIdForUser(
                $addressId,
                $userId
            );

        if ($address === null) {
            throw new OutOfBoundsException(
                'Address not found.'
            );
        }

        return $this->formatAddress(
            $address
        );
    }

    public function create(
        int $userId,
        array $data
    ): array {
        $addressLabel =
            $this->optionalString(
                $data['address_label'] ?? null,
                'Address label',
                50
            );

        $addressLine1 =
            $this->requiredString(
                $data['address_line_1'] ?? null,
                'Address line 1',
                150
            );

        $addressLine2 =
            $this->optionalString(
                $data['address_line_2'] ?? null,
                'Address line 2',
                150
            );

        $city =
            $this->requiredString(
                $data['city'] ?? null,
                'City',
                100
            );

        $province =
            $this->requiredString(
                $data['province'] ?? null,
                'Province',
                100
            );

        $postalCode =
            $this->requiredString(
                $data['postal_code'] ?? null,
                'Postal code',
                20
            );

        $country =
            $this->optionalString(
                $data['country']
                    ?? 'South Africa',
                'Country',
                100
            ) ?? 'South Africa';

        $existingCount =
            $this->addresses->countByUserId(
                $userId
            );

        /*
         * First saved address automatically
         * becomes the default.
         */
        $isDefault =
            $existingCount === 0
            || $this->booleanValue(
                $data['is_default'] ?? false
            );

        $addressId =
            $this->addresses->create(
                $userId,
                $addressLabel,
                $addressLine1,
                $addressLine2,
                $city,
                $province,
                $postalCode,
                $country,
                $isDefault
            );

        return $this->getOwnedAddress(
            $userId,
            $addressId
        );
    }

    private function formatAddress(
        array $row
    ): array {
        return [
            'address_id' =>
                (int) $row['address_id'],

            'address_label' =>
                $row['address_label'],

            'address_line_1' =>
                $row['address_line_1'],

            'address_line_2' =>
                $row['address_line_2'],

            'city' =>
                $row['city'],

            'province' =>
                $row['province'],

            'postal_code' =>
                $row['postal_code'],

            'country' =>
                $row['country'],

            'is_default' =>
                (bool) $row['is_default'],
        ];
    }

    private function requiredString(
        mixed $value,
        string $field,
        int $maxLength
    ): string {
        $value = trim((string) $value);

        if ($value === '') {
            throw new InvalidArgumentException(
                $field . ' is required.'
            );
        }

        if (mb_strlen($value) > $maxLength) {
            throw new InvalidArgumentException(
                $field .
                ' may not exceed ' .
                $maxLength .
                ' characters.'
            );
        }

        return $value;
    }

    private function optionalString(
        mixed $value,
        string $field,
        int $maxLength
    ): ?string {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (mb_strlen($value) > $maxLength) {
            throw new InvalidArgumentException(
                $field .
                ' may not exceed ' .
                $maxLength .
                ' characters.'
            );
        }

        return $value;
    }

    private function booleanValue(
        mixed $value
    ): bool {
        if (is_bool($value)) {
            return $value;
        }

        if (
            $value === 1
            || $value === '1'
        ) {
            return true;
        }

        if (
            $value === 0
            || $value === '0'
            || $value === null
            || $value === ''
        ) {
            return false;
        }

        $validated =
            filter_var(
                $value,
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );

        if ($validated === null) {
            throw new InvalidArgumentException(
                'is_default must be a boolean.'
            );
        }

        return $validated;
    }
}