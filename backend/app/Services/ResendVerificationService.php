<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Core\Database;
use MultiSS\Repositories\UserRepository;
use MultiSS\Repositories\UserTokenRepository;
use PDO;
use Throwable;

final class ResendVerificationService
{
    private PDO $pdo;
    private UserRepository $users;
    private UserTokenRepository $tokens;
    private array $mailConfig;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();

        $this->users =
            new UserRepository($this->pdo);

        $this->tokens =
            new UserTokenRepository($this->pdo);

        $this->mailConfig =
            require __DIR__ . '/../../config/mail.php';
    }

    public function createTokenForEmail(
        string $email
    ): array {
        $email = strtolower(trim($email));

        if (
            $email === ''
            || !filter_var(
                $email,
                FILTER_VALIDATE_EMAIL
            )
        ) {
            return [
                'success' => false,
                'errors' => [
                    'email' =>
                        'A valid email address is required.',
                ],
            ];
        }

        $user = $this->users->findByEmail(
            $email
        );

        /*
         * Do not reveal whether the account exists.
         */
        if ($user === null) {
            return [
                'success' => true,
                'send_email' => false,
            ];
        }

        /*
         * No verification email is needed
         * for an already verified account.
         */
        if ($user['email_verified_at'] !== null) {
            return [
                'success' => true,
                'send_email' => false,
            ];
        }

        $rawToken = bin2hex(
            random_bytes(32)
        );

        $tokenHash = hash(
            'sha256',
            $rawToken
        );

        $expiryMinutes = (int)
            $this->mailConfig[
                'email_verification_expiry_minutes'
            ];

        $expiresAt = date(
            'Y-m-d H:i:s',
            time() + ($expiryMinutes * 60)
        );

        $ownsTransaction =
            !$this->pdo->inTransaction();

        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $this->tokens
                ->invalidateUnusedForUserAndType(
                    (int) $user['user_id'],
                    'email_verification'
                );

            $this->tokens->create(
                (int) $user['user_id'],
                'email_verification',
                $tokenHash,
                $expiresAt
            );

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return [
                'success' => true,
                'send_email' => true,
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'verification_token' => $rawToken,
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