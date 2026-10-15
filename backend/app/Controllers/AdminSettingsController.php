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

final class AdminSettingsController
{
    private AdminService $admin;

    public function __construct(
        ?AdminService $admin = null
    ) {
        $this->admin =
            $admin ?? new AdminService();
    }

    public function commissionIndex():
        void
    {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->commissionRules()
        );
    }

    public function commissionUpdate(
        Request $request,
        array $adminUser
    ): void {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->updateCommission(
                        $adminUser,
                        $request->body()
                    ),
            'Commission configuration updated.'
        );
    }

    public function deliveryIndex():
        void
    {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->deliveryRates()
        );
    }

    public function deliveryStore(
        Request $request,
        array $adminUser
    ): void {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->createDeliveryRate(
                        $adminUser,
                        $request->body()
                    ),
            'Delivery rate created.'
        );
    }

    public function deliveryUpdate(
        Request $request,
        array $adminUser,
        int $deliveryRateId
    ): void {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->updateDeliveryRate(
                        $adminUser,
                        $deliveryRateId,
                        $request->body()
                    ),
            'Delivery rate updated.'
        );
    }

    public function deliveryDestroy(
        int $deliveryRateId
    ): void {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->archiveDeliveryRate(
                        $deliveryRateId
                    ),
            'Delivery rate archived.'
        );
    }

    public function collectionShow():
        void
    {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->collectionLocation()
        );
    }

    public function collectionUpdate(
        Request $request,
        array $adminUser
    ): void {
        $this->respond(
            fn (): array =>
                $this->admin
                    ->updateCollectionLocation(
                        $adminUser,
                        $request->body()
                    ),
            'Collection location updated.'
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
                'Admin settings operation failed',
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
                    'Unable to complete administrator settings operation.',
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