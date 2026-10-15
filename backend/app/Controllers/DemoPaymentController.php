<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\PaymentService;
use OutOfBoundsException;
use RuntimeException;
use Throwable;

final class DemoPaymentController
{
    private PaymentService $payments;

    public function __construct(
        ?PaymentService $payments = null
    ) {
        $this->payments =
            $payments
            ?? new PaymentService();
    }

    public function show(
        array $user,
        string $paymentId
    ): void {
        try {
            $payment =
                $this->payments->getPayment(
                    $user,
                    (int) $paymentId
                );

            Response::json([
                'success' => true,
                'data' => [
                    'payment' =>
                        $payment,
                ],
            ], 200);
        } catch (
            InvalidArgumentException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 422);
        } catch (
            OutOfBoundsException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 404);
        } catch (
            DomainException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 403);
        }
    }

    public function process(
        Request $request,
        array $user
    ): void {
        try {
            $result =
                $this->payments
                    ->processDemoPayment(
                        $user,
                        $request->body()
                    );

            Response::json([
                'success' => true,
                'message' =>
                    'Demo payment processed.',
                'data' =>
                    $result,
            ], 200);
        } catch (
            InvalidArgumentException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 422);
        } catch (
            OutOfBoundsException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 404);
        } catch (
            DomainException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 409);
        } catch (
            RuntimeException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 503);
        }
    }

    public function webhook(
        Request $request
    ): void {
        try {
            $result =
                $this->payments
                    ->handleDemoWebhook(
                        $request
                    );

            Response::json([
                'success' => true,
                'message' =>
                    'Payment webhook processed.',
                'data' => [
                    'payment' =>
                        $result,
                ],
            ], 200);
        } catch (
            InvalidArgumentException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 400);
        } catch (
            OutOfBoundsException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 404);
        } catch (
            DomainException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 409);
        } catch (
            RuntimeException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 503);
        } catch (
            Throwable $exception
        ) {
            error_log(
                '[Demo Payment Webhook] '
                . $exception->getMessage()
            );

            Response::json([
                'success' => false,
                'message' =>
                    'Unable to process payment webhook.',
            ], 500);
        }
    }

    public function refund(
        Request $request,
        array $admin,
        string $paymentId
    ): void {
        try {
            $refund =
                $this->payments
                    ->refundDemoPayment(
                        $admin,
                        (int) $paymentId,
                        $request->body()
                    );

            Response::json([
                'success' => true,
                'message' =>
                    'Demo refund completed.',
                'data' => [
                    'refund' =>
                        $refund,
                ],
            ], 200);
        } catch (
            InvalidArgumentException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 422);
        } catch (
            OutOfBoundsException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 404);
        } catch (
            DomainException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    $exception->getMessage(),
            ], 409);
        }
    }
}