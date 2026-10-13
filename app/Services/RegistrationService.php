<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Core\Database;
use MultiSS\Repositories\AddressRepository;
use MultiSS\Repositories\CustomerProfileRepository;
use MultiSS\Repositories\RoleRepository;
use MultiSS\Repositories\UserRepository;
use MultiSS\Repositories\UserTokenRepository;
use MultiSS\Validators\RegistrationValidator;
use PDO;
use RuntimeException;
use Throwable;

final class RegistrationService
{
    private PDO $pdo;
    private UserRepository $users;
    private CustomerProfileRepository $customerProfiles;
    private RoleRepository $roles;
    private AddressRepository $addresses;
    private UserTokenRepository $tokens;
    private array $mailConfig;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();

        $this->users = new UserRepository($this->pdo);

        $this->customerProfiles =
            new CustomerProfileRepository($this->pdo);

        $this->roles = new RoleRepository($this->pdo);

        $this->addresses =
            new AddressRepository($this->pdo);

        $this->tokens =
            new UserTokenRepository($this->pdo);

            $this->mailConfig =
    require __DIR__ . '/../../config/mail.php';
    }

    public function register(array $data): array
    {
        $errors = RegistrationValidator::validate($data);

        if ($errors !== []) {
            return [
                'success' => false,
                'errors' => $errors,
            ];
        }

        $email = strtolower(trim($data['email']));

        if ($this->users->findByEmail($email) !== null) {
            return [
                'success' => false,
                'errors' => [
                    'email' => 'An account with this email already exists.',
                ],
            ];
        }

        $passwordHash = password_hash(
            $data['password'],
            PASSWORD_DEFAULT
        );

        if ($passwordHash === false) {
            throw new RuntimeException(
                'Unable to securely hash password.'
            );
        }

        $rawVerificationToken = bin2hex(
            random_bytes(32)
        );

        $verificationTokenHash = hash(
            'sha256',
            $rawVerificationToken
        );

        $expiryMinutes = (int)
    $this->mailConfig[
        'email_verification_expiry_minutes'
    ];

$verificationExpiresAt = date(
    'Y-m-d H:i:s',
    time() + ($expiryMinutes * 60)
);

       $ownsTransaction = !$this->pdo->inTransaction();

if ($ownsTransaction) {
    $this->pdo->beginTransaction();
}

try {
            $userId = $this->users->create(
                trim($data['first_name']),
                trim($data['last_name']),
                $email,
                trim($data['phone']),
                $passwordHash
            );

            $this->customerProfiles->create(
                $userId,
                trim($data['institution_company_name']),
                trim($data['vat_number'])
            );

            $customerRole = $this->roles->findByName(
                'customer'
            );

            if ($customerRole === null) {
                throw new RuntimeException(
                    'Customer role is not configured.'
                );
            }

            $this->roles->assignToUser(
                $userId,
                (int) $customerRole['role_id']
            );

            $addressLine2 = null;

            if (
                isset($data['address_line_2'])
                && trim((string) $data['address_line_2']) !== ''
            ) {
                $addressLine2 =
                    trim((string) $data['address_line_2']);
            }

            $country = 'South Africa';

            if (
                isset($data['country'])
                && trim((string) $data['country']) !== ''
            ) {
                $country =
                    trim((string) $data['country']);
            }

            $this->addresses->create(
                $userId,
                'Billing',
                trim($data['address_line_1']),
                $addressLine2,
                trim($data['city']),
                trim($data['province']),
                trim($data['postal_code']),
                $country,
                true
            );

            $this->tokens->create(
                $userId,
                'email_verification',
                $verificationTokenHash,
                $verificationExpiresAt
            );

            if ($ownsTransaction) {
    $this->pdo->commit();
}

            return [
                'success' => true,
                'user_id' => $userId,

                // Internal use only.
                // This must never be returned in the API response.
                'verification_token' =>
                    $rawVerificationToken,

                'verification_expires_at' =>
                    $verificationExpiresAt,
            ];
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