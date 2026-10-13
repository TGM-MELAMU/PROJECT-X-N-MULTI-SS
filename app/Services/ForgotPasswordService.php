<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Core\Config;
use MultiSS\Core\Database;
use MultiSS\Repositories\UserRepository;
use MultiSS\Repositories\UserTokenRepository;
use PDO;
use Throwable;

final class ForgotPasswordService
{
    private PDO $pdo;
    private UserRepository $users;
    private UserTokenRepository $tokens;
    private array $mailConfig;

    public function __construct(
        ?PDO $pdo = null,
        ?UserRepository $users = null,
        ?UserTokenRepository $tokens = null
    ) {
        $this->pdo =
            $pdo ?? Database::connection();

        $this->users =
            $users ?? new UserRepository($this->pdo);

        $this->tokens =
            $tokens ?? new UserTokenRepository($this->pdo);

        $configPath =
            dirname(__DIR__, 2)
            . '/config/mail.php';

        $this->mailConfig = require $configPath;
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
         * Inactive accounts cannot authenticate,
         * so do not issue reset tokens for them.
         *
         * Still return the same safe response shape.
         */
        if ($user['status'] !== 'active') {
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

        $expiryMinutes = (int) (
            $this->mailConfig[
                'password_reset_expiry_minutes'
            ] ?? 60
        );

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
                    'password_reset'
                );

            $this->tokens->create(
                (int) $user['user_id'],
                'password_reset',
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
                'reset_token' => $rawToken,
                'expires_at' => $expiresAt,
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