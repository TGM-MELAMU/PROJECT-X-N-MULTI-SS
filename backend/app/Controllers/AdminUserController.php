<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Logger;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\AdminService;
use OutOfBoundsException;
use Throwable;

final class AdminUserController
{
    private AdminService $admin;

    public function __construct(
        ?AdminService $admin = null
    ) {
        $this->admin =
            $admin ?? new AdminService();
    }

    public function index(
        Request $request
    ): void {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->listUsers(
                        $request->query()
                    )
        );
    }

    public function show(
        int $userId
    ): void {
        $this->respond(
            fn (): array => [
                'user' =>
                    $this->admin
                        ->getUser(
                            $userId
                        ),
            ]
        );
    }

    public function update(
        Request $request,
        array $currentAdmin,
        int $userId
    ): void {
        $this->respond(
            fn (): array => [
                'user' =>
                    $this->admin
                        ->updateUser(
                            $currentAdmin,
                            $userId,
                            $request->body()
                        ),
            ],
            'User updated successfully.'
        );
    }

    public function destroy(
        array $currentAdmin,
        int $userId
    ): void {
        $this->respond(
            fn (): array => [
                'user' =>
                    $this->admin
                        ->archiveUser(
                            $currentAdmin,
                            $userId
                        ),
            ],
            'User archived successfully.'
        );
    }

    public function resetPassword(
        int $userId
    ): void {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->triggerPasswordReset(
                        $userId
                    ),
            'Password reset requested.'
        );
    }

    private function respond(
        callable $callback,
        ?string $message = null
    ): void {
        try {
            $response = [
                'success' =>
                    true,

                'data' =>
                    $callback(),
            ];

            if ($message !== null) {
                $response['message'] =
                    $message;
            }

            Response::json(
                $response,
                200
            );
        } catch (
            InvalidArgumentException $exception
        ) {
            $this->error(
                $exception,
                422
            );
        } catch (
            OutOfBoundsException $exception
        ) {
            $this->error(
                $exception,
                404
            );
        } catch (
            DomainException $exception
        ) {
            $this->error(
                $exception,
                409
            );
        } catch (Throwable $exception) {
            Logger::error(
                'Admin user operation failed',
                [
                    'type' =>
                        $exception::class,

                    'message' =>
                        $exception
                            ->getMessage(),
                ]
            );

            Response::json([
                'success' => false,
                'message' =>
                    'Unable to complete administrator user operation.',
            ], 500);
        }
    }

    private function error(
        Throwable $exception,
        int $status
    ): void {
        Response::json([
            'success' => false,
            'message' =>
                $exception->getMessage(),
        ], $status);
    }
}