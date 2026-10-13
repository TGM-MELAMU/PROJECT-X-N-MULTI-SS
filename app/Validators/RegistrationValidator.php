<?php

declare(strict_types=1);

namespace MultiSS\Validators;

final class RegistrationValidator
{
    public static function validate(array $data): array
    {
        $errors = [];

        self::validateRequiredString(
            $errors,
            $data,
            'first_name',
            'First name',
            100
        );

        self::validateRequiredString(
            $errors,
            $data,
            'last_name',
            'Last name',
            100
        );

        self::validateRequiredString(
            $errors,
            $data,
            'institution_company_name',
            'Institution/company name',
            150
        );

        self::validateRequiredString(
            $errors,
            $data,
            'vat_number',
            'VAT number',
            100
        );

        self::validateRequiredString(
            $errors,
            $data,
            'email',
            'Email',
            255
        );

        self::validateRequiredString(
            $errors,
            $data,
            'phone',
            'Contact number',
            30
        );

        self::validateRequiredString(
            $errors,
            $data,
            'address_line_1',
            'Address line 1',
            150
        );

        self::validateRequiredString(
            $errors,
            $data,
            'city',
            'City',
            100
        );

        self::validateRequiredString(
            $errors,
            $data,
            'province',
            'Province',
            100
        );

        self::validateRequiredString(
            $errors,
            $data,
            'postal_code',
            'Postal code',
            20
        );

        if (
            isset($data['address_line_2'])
            && $data['address_line_2'] !== null
            && strlen(trim((string) $data['address_line_2'])) > 150
        ) {
            $errors['address_line_2'] =
                'Address line 2 may not exceed 150 characters.';
        }

        if (
            isset($data['country'])
            && $data['country'] !== null
            && strlen(trim((string) $data['country'])) > 100
        ) {
            $errors['country'] =
                'Country may not exceed 100 characters.';
        }

        if (
            !isset($errors['email'])
            && !filter_var(
                trim((string) $data['email']),
                FILTER_VALIDATE_EMAIL
            )
        ) {
            $errors['email'] = 'A valid email address is required.';
        }

       if (
    !isset($data['password'])
    || !is_string($data['password'])
    || $data['password'] === ''
) {
    $errors['password'] = 'Password is required.';
} else {
    $password = $data['password'];

    if (strlen($password) < 8) {
    $errors['password'] =
        'Password must be at least 8 characters.';
    } elseif (strlen($password) > 128) {
        $errors['password'] =
            'Password may not exceed 128 characters.';
    } elseif (!preg_match('/[A-Z]/', $password)) {
        $errors['password'] =
            'Password must contain at least one uppercase letter.';
    } elseif (!preg_match('/[a-z]/', $password)) {
        $errors['password'] =
            'Password must contain at least one lowercase letter.';
    } elseif (!preg_match('/[0-9]/', $password)) {
        $errors['password'] =
            'Password must contain at least one number.';
    } elseif (!preg_match('/[^A-Za-z0-9\s]/', $password)) {
        $errors['password'] =
            'Password must contain at least one special character.';
    }
}

        return $errors;
    }

    private static function validateRequiredString(
        array &$errors,
        array $data,
        string $field,
        string $label,
        int $maxLength
    ): void {
        if (
            !isset($data[$field])
            || !is_string($data[$field])
            || trim($data[$field]) === ''
        ) {
            $errors[$field] = $label . ' is required.';
            return;
        }

        if (strlen(trim($data[$field])) > $maxLength) {
            $errors[$field] =
                $label
                . ' may not exceed '
                . $maxLength
                . ' characters.';
        }
    }
}