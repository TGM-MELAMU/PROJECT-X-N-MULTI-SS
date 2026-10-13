<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Core\Database;
use MultiSS\Repositories\UserRepository;
use MultiSS\Repositories\UserTokenRepository;
use PDO;
use RuntimeException;
use Throwable;

final class ResetPasswordService
{
    private PDO $pdo;
    private UserRepository $users;
    private UserTokenRepository $tokens;

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
    }

    public function reset(
        string $rawToken,
        string $password
    ): array {
        $rawToken = trim($rawToken);

        $passwordErrors =
            $this->validatePassword($password);

        if ($passwordErrors !== []) {
            return [
                'success' => false,
                'status' => 422,
                'message' => 'Validation failed.',
                'errors' => [
                    'password' => $passwordErrors,
                ],
            ];
        }

        if (
            strlen($rawToken) !== 64
            || !ctype_xdigit($rawToken)
        ) {
            return [
                'success' => false,
                'status' => 400,
                'message' =>
                    'The password reset link is invalid or has expired.',
            ];
        }

        $tokenHash = hash(
            'sha256',
            $rawToken
        );

        $ownsTransaction =
            !$this->pdo->inTransaction();

        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $token =
                $this->tokens
                    ->findValidByHashAndTypeForUpdate(
                        $tokenHash,
                        'password_reset'
                    );

            if ($token === null) {
                if (
                    $ownsTransaction
                    && $this->pdo->inTransaction()
                ) {
                    $this->pdo->rollBack();
                }

                return [
                    'success' => false,
                    'status' => 400,
                    'message' =>
                        'The password reset link is invalid or has expired.',
                ];
            }

            $userId =
                (int) $token['user_id'];

            $user =
                $this->users->findById(
                    $userId
                );

            if (
                $user === null
                || $user['status'] !== 'active'
            ) {
                if (
                    $ownsTransaction
                    && $this->pdo->inTransaction()
                ) {
                    $this->pdo->rollBack();
                }

                return [
                    'success' => false,
                    'status' => 400,
                    'message' =>
                        'The password reset link is invalid or has expired.',
                ];
            }

            $passwordHash =
                password_hash(
                    $password,
                    PASSWORD_DEFAULT
                );

            if ($passwordHash === false) {
                throw new RuntimeException(
                    'Unable to hash password.'
                );
            }

            $this->users->updatePasswordHash(
                $userId,
                $passwordHash
            );

            $this->tokens->markUsed(
                (int) $token['token_id']
            );

            /*
             * Invalidate any other unused reset
             * tokens belonging to this user.
             */
            $this->tokens
                ->invalidateUnusedForUserAndType(
                    $userId,
                    'password_reset'
                );

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return [
                'success' => true,
                'user_id' => $userId,
                'message' =>
                    'Password reset successfully.',
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

    private function validatePassword(
        string $password
    ): array {
        $errors = [];

        if ($password === '') {
            $errors[] = 'Password is required.';

            return $errors;
        }

        if (strlen($password) < 8) {
            $errors[] =
                'Password must be at least 8 characters.';
        } elseif (strlen($password) > 128) {
            $errors[] =
                'Password may not exceed 128 characters.';
        } elseif (!preg_match('/[A-Z]/', $password)) {
            $errors[] =
                'Password must contain at least one uppercase letter.';
        } elseif (!preg_match('/[a-z]/', $password)) {
            $errors[] =
                'Password must contain at least one lowercase letter.';
        } elseif (!preg_match('/[0-9]/', $password)) {
            $errors[] =
                'Password must contain at least one number.';
        } elseif (
            !preg_match(
                '/[^A-Za-z0-9\s]/',
                $password
            )
        ) {
            $errors[] =
                'Password must contain at least one special character.';
        }

        return $errors;
    }
}