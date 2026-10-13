<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Core\Database;
use MultiSS\Repositories\UserRepository;
use MultiSS\Repositories\UserTokenRepository;
use PDO;
use Throwable;

final class EmailVerificationService
{
    private PDO $pdo;
    private UserRepository $users;
    private UserTokenRepository $tokens;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();

        $this->users = new UserRepository($this->pdo);
        $this->tokens = new UserTokenRepository($this->pdo);
    }

    public function verify(string $rawToken): array
    {
        $rawToken = trim($rawToken);

        if (
            strlen($rawToken) !== 64
            || !ctype_xdigit($rawToken)
        ) {
            return [
                'success' => false,
                'message' =>
                    'The verification link is invalid or has expired.',
            ];
        }

        $tokenHash = hash(
            'sha256',
            $rawToken
        );

        $ownsTransaction = !$this->pdo->inTransaction();

        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $token = $this->tokens->findValidByHashAndType(
                $tokenHash,
                'email_verification'
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
                    'message' =>
                        'The verification link is invalid or has expired.',
                ];
            }

            $userId = (int) $token['user_id'];

            $user = $this->users->findById(
                $userId
            );

            if ($user === null) {
                if (
                    $ownsTransaction
                    && $this->pdo->inTransaction()
                ) {
                    $this->pdo->rollBack();
                }

                return [
                    'success' => false,
                    'message' =>
                        'The verification link is invalid or has expired.',
                ];
            }

            $this->users->markEmailVerified(
                $userId
            );

            $this->tokens->markUsed(
                (int) $token['token_id']
            );

            if ($ownsTransaction) {
                $this->pdo->commit();
            }

            return [
                'success' => true,
                'user_id' => $userId,
                'message' =>
                    'Email address verified successfully.',
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