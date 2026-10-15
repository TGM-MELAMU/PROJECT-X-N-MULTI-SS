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

final class PaymentController
{
    private PaymentService $payments;

    public function __construct(
        ?PaymentService $payments = null
    ) {
        $this->payments =
            $payments
            ?? new PaymentService();
    }

    public function createPayFastRequest(
        Request $request,
        array $user
    ): void {
        try {
            $payment =
                $this->payments
                    ->createPayFastRequest(
                        $user,
                        $request->body()
                    );

            Response::json([
                'success' => true,
                'message' =>
                    'PayFast payment request created.',
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
            ], 409);
        } catch (
            RuntimeException $exception
        ) {
            Response::json([
                'success' => false,
                'message' =>
                    'Payment gateway configuration error.',
            ], 503);
        }
    }

    public function notifyPayFast(
        Request $request
    ): void {
        try {
            $result =
                $this->payments
                    ->handlePayFastItn(
                        $request
                    );

            /*
             * PayFast only needs a successful
             * HTTP acknowledgement after a valid ITN.
             */
            Response::text(
                'OK',
                200
            );
        } catch (
            InvalidArgumentException $exception
        ) {
            Response::text(
                'Invalid ITN',
                400
            );
        } catch (
            OutOfBoundsException $exception
        ) {
            Response::text(
                'Unknown payment',
                404
            );
       } catch (
    DomainException $exception
) {
    error_log(
        '[PayFast ITN] '
        . $exception->getMessage()
    );

    Response::text(
        'ITN validation failed',
        409
    );

        } catch (
            RuntimeException $exception
        ) {
            /*
             * A temporary PayFast/cURL/DNS problem
             * receives a non-200 so the notification
             * is not treated as successfully handled.
             */
            Response::text(
                'ITN verification unavailable',
                502
            );
        }
    }

    public function returnFromPayFast(
        Request $request
    ): void {
        Response::json([
            'success' => true,
            'message' =>
                'Returned from PayFast. Payment status is confirmed separately by the server notification.',
        ], 200);
    }

    public function cancelPayFast(
        Request $request
    ): void {
        Response::json([
            'success' => true,
            'message' =>
                'PayFast checkout was cancelled or interrupted.',
        ], 200);
    }
}