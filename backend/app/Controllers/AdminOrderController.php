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

final class AdminOrderController
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
                    ->listOrders(
                        $request->query()
                    )
        );
    }

    public function show(
        string $orderNumber
    ): void {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->getOrder(
                        $orderNumber
                    )
        );
    }

    public function refund(
        Request $request,
        array $adminUser,
        string $orderNumber
    ): void {
        $this->respond(
            fn (): array => [
                'refund' =>
                    $this->admin
                        ->refundOrder(
                            $adminUser,
                            $orderNumber,
                            $request->body()
                        ),
            ],
            'Demo refund completed.'
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
                'Admin order operation failed',
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
                    'Unable to complete administrator order operation.',
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