<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Request;
use MultiSS\Repositories\PaymentRepository;
use OutOfBoundsException;
use RuntimeException;

final class PaymentService
{
    use \MultiSS\Services\Concerns\DemoPaymentOperations;
    private PaymentRepository $payments;

    private array $config;

    public function __construct(
        ?PaymentRepository $payments = null,
        ?array $config = null
    ) {
        $this->payments =
            $payments
            ?? new PaymentRepository();

        $this->config =
            $config
            ?? require __DIR__
                . '/../../config/payment.php';
    }

    public function createPayFastRequest(
        array $user,
        array $data
    ): array {
        if (
            ($user['email_verified'] ?? false)
            !== true
        ) {
            throw new DomainException(
                'Email verification is required before payment.'
            );
        }

        $userId =
            (int) (
                $user['user_id']
                ?? 0
            );

        if ($userId <= 0) {
            throw new DomainException(
                'Authentication required.'
            );
        }

        $orderId =
            $this->positiveInt(
                $data['order_id']
                ?? null,
                'Order ID'
            );

        $this->assertConfigured();

        $payment =
            $this->payments
                ->getOrCreatePendingPayFastPayment(
                    $orderId,
                    $userId
                );

        /*
         * PayFast custom-integration field order.
         */
        $fields = [
            'merchant_id' =>
                $this->config[
                    'merchant_id'
                ],

            'merchant_key' =>
                $this->config[
                    'merchant_key'
                ],

            'return_url' =>
                $this->config[
                    'return_url'
                ],

            'cancel_url' =>
                $this->config[
                    'cancel_url'
                ],

            'notify_url' =>
                $this->config[
                    'notify_url'
                ],

            'name_first' =>
                $payment[
                    'first_name'
                ],

            'name_last' =>
                $payment[
                    'last_name'
                ],

            'email_address' =>
                $payment[
                    'email'
                ],

            'cell_number' =>
                $payment[
                    'contact_number'
                ],

            'm_payment_id' =>
                $payment[
                    'order_number'
                ],

            'amount' =>
                number_format(
                    (float) $payment[
                        'amount'
                    ],
                    2,
                    '.',
                    ''
                ),

            'item_name' =>
                'MultiSS Order '
                . $payment[
                    'order_number'
                ],

            'item_description' =>
                'MultiSS ecommerce order',

            'custom_int1' =>
                (string) $payment[
                    'order_id'
                ],

            'custom_int2' =>
                (string) $payment[
                    'payment_id'
                ],
        ];

        $fields['signature'] =
            $this->generateSignature(
                $fields
            );

        return [
            'payment_id' =>
                $payment[
                    'payment_id'
                ],

            'payment_status' =>
                $payment[
                    'payment_status'
                ],

            'order_id' =>
                $payment[
                    'order_id'
                ],

            'order_number' =>
                $payment[
                    'order_number'
                ],

            'amount' =>
                (float) $fields[
                    'amount'
                ],

            'gateway' =>
                'PayFast',

            'sandbox' =>
                (bool) $this->config[
                    'sandbox'
                ],

            'process_url' =>
                $this->config[
                    'process_url'
                ],

            'fields' =>
                $fields,
        ];
    }

    public function handlePayFastItn(
        Request $request
    ): array {
        $this->assertConfigured();

        $data =
            $request->body();

        $required = [
            'm_payment_id',
            'pf_payment_id',
            'payment_status',
            'amount_gross',
            'merchant_id',
            'custom_int1',
            'custom_int2',
            'signature',
        ];

        foreach ($required as $field) {
            if (
                !array_key_exists(
                    $field,
                    $data
                )
                || trim(
                    (string) $data[
                        $field
                    ]
                ) === ''
            ) {
                throw new InvalidArgumentException(
                    'Missing PayFast field: '
                    . $field
                );
            }
        }

        if (
            !hash_equals(
                (string) $this->config[
                    'merchant_id'
                ],
                trim(
                    (string) $data[
                        'merchant_id'
                    ]
                )
            )
        ) {
            throw new DomainException(
                'PayFast merchant mismatch.'
            );
        }

        $orderId =
            $this->positiveInt(
                $data['custom_int1'],
                'PayFast order ID'
            );

        $paymentId =
            $this->positiveInt(
                $data['custom_int2'],
                'PayFast payment ID'
            );

        $payment =
            $this->payments
                ->findPayFastPayment(
                    $paymentId,
                    $orderId
                );

        if ($payment === null) {
            throw new OutOfBoundsException(
                'PayFast payment not found.'
            );
        }

        if (
            !hash_equals(
                (string) $payment[
                    'order_number'
                ],
                trim(
                    (string) $data[
                        'm_payment_id'
                    ]
                )
            )
        ) {
            throw new DomainException(
                'PayFast order reference mismatch.'
            );
        }

        /*
         * Build PayFast's parameter string in the
         * order received, excluding signature.
         */
        $parameterString =
            $this->buildParameterString(
                $data
            );

        if (
            !$this->validItnSignature(
                $data,
                $parameterString
            )
        ) {
            throw new DomainException(
                'Invalid PayFast ITN signature.'
            );
        }

        /*
         * Verify that the callback came from a
         * PayFast-owned source.
         */
        if (
            !$this->validPayFastSource(
                $request
            )
        ) {
            throw new DomainException(
                'Invalid PayFast ITN source.'
            );
        }

        /*
         * PayFast recommends a tolerance of one
         * cent when comparing payment amounts.
         */
        $amountGross =
            (float) $data[
                'amount_gross'
            ];

        $expectedPaymentAmount =
            (float) $payment[
                'payment_amount'
            ];

        $expectedOrderAmount =
            (float) $payment[
                'total_amount'
            ];

        if (
            abs(
                $expectedPaymentAmount
                - $amountGross
            ) > 0.01
            || abs(
                $expectedOrderAmount
                - $amountGross
            ) > 0.01
        ) {
            throw new DomainException(
                'PayFast payment amount mismatch.'
            );
        }

        /*
         * Verify the exact notification data
         * directly with PayFast.
         */
        if (
            !$this->validServerConfirmation(
                $parameterString
            )
        ) {
            throw new RuntimeException(
                'PayFast server confirmation failed.'
            );
        }

        /*
         * Only COMPLETE means money was
         * successfully received.
         */
        if (
            strtoupper(
                trim(
                    (string) $data[
                        'payment_status'
                    ]
                )
            ) !== 'COMPLETE'
        ) {
            return [
                'processed' =>
                    false,

                'payment_complete' =>
                    false,

                'message' =>
                    'PayFast notification acknowledged without payment completion.',
            ];
        }

        $result =
            $this->payments
                ->confirmPayFastPayment(
                    $paymentId,
                    $orderId,
                    trim(
                        (string) $data[
                            'm_payment_id'
                        ]
                    ),
                    trim(
                        (string) $data[
                            'pf_payment_id'
                        ]
                    )
                );

        return [
            'processed' =>
                true,

            'payment_complete' =>
                true,

            'already_processed' =>
                $result[
                    'already_processed'
                ],

            'payment_id' =>
                $result[
                    'payment_id'
                ],

            'order_id' =>
                $result[
                    'order_id'
                ],
        ];
    }

   private function buildParameterString(
    array $data
): string {
    $parts = [];

    foreach ($data as $key => $value) {
        /*
         * PayFast signs every field appearing
         * before "signature", including blank
         * values.
         *
         * Field order must remain exactly as
         * PayFast submitted it.
         */
        if ($key === 'signature') {
            break;
        }

        $parts[] =
            $key
            . '='
            . urlencode(
                stripslashes(
                    (string) $value
                )
            );
    }

    return implode(
        '&',
        $parts
    );
}

    private function validItnSignature(
        array $data,
        string $parameterString
    ): bool {
        $signatureString =
            $parameterString;

        $passphrase =
            trim(
                (string) (
                    $this->config[
                        'passphrase'
                    ]
                    ?? ''
                )
            );

        if ($passphrase !== '') {
            $signatureString .=
                '&passphrase='
                . urlencode(
                    $passphrase
                );
        }

        $expectedSignature =
            md5(
                $signatureString
            );

        $receivedSignature =
            strtolower(
                trim(
                    (string) $data[
                        'signature'
                    ]
                )
            );

        return hash_equals(
            $expectedSignature,
            $receivedSignature
        );
    }

    private function validPayFastSource(
        Request $request
    ): bool {
        /*
         * PayFast's documented ITN hosts.
         * Resolve them dynamically because the
         * underlying addresses can change.
         */
$validHosts = [
    'www.payfast.co.za',
    'sandbox.payfast.co.za',
    'w1w.payfast.co.za',
    'w2w.payfast.co.za',
];

        $validIps = [];

        foreach ($validHosts as $host) {
            $resolved =
                gethostbynamel(
                    $host
                );

            if ($resolved !== false) {
                $validIps =
                    array_merge(
                        $validIps,
                        $resolved
                    );
            }
        }

        $validIps =
            array_values(
                array_unique(
                    $validIps
                )
            );

        if ($validIps === []) {
            throw new RuntimeException(
                'Unable to resolve PayFast source addresses.'
            );
        }

        $candidates = [];

        $remoteAddress =
            trim(
                (string) (
                    $_SERVER[
                        'REMOTE_ADDR'
                    ]
                    ?? ''
                )
            );

        if ($remoteAddress !== '') {
            $candidates[] =
                $remoteAddress;
        }

        /*
         * ngrok terminates the external
         * connection before forwarding to
         * local Apache, so the original client
         * address is provided in X-Forwarded-For.
         *
         * We still require the signature,
         * amount and PayFast server confirmation,
         * so this is only one of several checks.
         */
        $forwardedFor =
            $request->header(
                'X-Forwarded-For'
            );

        if ($forwardedFor !== null) {
            foreach (
                explode(
                    ',',
                    $forwardedFor
                )
                as $candidate
            ) {
                $candidate =
                    trim($candidate);

                if (
                    filter_var(
                        $candidate,
                        FILTER_VALIDATE_IP
                    ) !== false
                ) {
                    $candidates[] =
                        $candidate;
                }
            }
        }

        foreach (
            array_unique($candidates)
            as $candidate
        ) {
            if (
                in_array(
                    $candidate,
                    $validIps,
                    true
                )
            ) {
                return true;
            }
        }

        return false;
    }

    private function validServerConfirmation(
        string $parameterString
    ): bool {
        if (
            !function_exists(
                'curl_init'
            )
        ) {
            throw new RuntimeException(
                'PHP cURL is required for PayFast validation.'
            );
        }

        $curl =
            curl_init();

        if ($curl === false) {
            throw new RuntimeException(
                'Unable to initialise PayFast validation.'
            );
        }

        curl_setopt_array(
            $curl,
            [
                CURLOPT_URL =>
                    $this->config[
                        'validate_url'
                    ],

                CURLOPT_POST =>
                    true,

                CURLOPT_POSTFIELDS =>
                    $parameterString,

                CURLOPT_RETURNTRANSFER =>
                    true,

                CURLOPT_HEADER =>
                    false,

                CURLOPT_SSL_VERIFYHOST =>
                    2,

                CURLOPT_SSL_VERIFYPEER =>
                    true,

                CURLOPT_CONNECTTIMEOUT =>
                    10,

                CURLOPT_TIMEOUT =>
                    20,

                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/x-www-form-urlencoded',
                ],

                CURLOPT_USERAGENT =>
                    'MultiSS-PayFast-ITN/1.0',
            ]
        );

        $response =
            curl_exec($curl);

        $curlError =
            curl_error($curl);

        $statusCode =
            (int) curl_getinfo(
                $curl,
                CURLINFO_HTTP_CODE
            );

        curl_close($curl);

        if ($response === false) {
            throw new RuntimeException(
                'PayFast validation request failed: '
                . $curlError
            );
        }

        if (
            $statusCode < 200
            || $statusCode >= 300
        ) {
            throw new RuntimeException(
                'PayFast validation returned HTTP '
                . $statusCode
                . '.'
            );
        }

        return
            trim(
                (string) $response
            ) === 'VALID';
    }

    private function generateSignature(
        array $fields
    ): string {
        $parts = [];

        foreach ($fields as $key => $value) {
            if (
                $key === 'signature'
                || $value === null
                || trim(
                    (string) $value
                ) === ''
            ) {
                continue;
            }

            $parts[] =
                $key
                . '='
                . urlencode(
                    trim(
                        (string) $value
                    )
                );
        }

        $passphrase =
            trim(
                (string) (
                    $this->config[
                        'passphrase'
                    ]
                    ?? ''
                )
            );

        if ($passphrase !== '') {
            $parts[] =
                'passphrase='
                . urlencode(
                    $passphrase
                );
        }

        return md5(
            implode(
                '&',
                $parts
            )
        );
    }

    private function assertConfigured(): void
    {
        $required = [
            'merchant_id',
            'merchant_key',
            'process_url',
            'validate_url',
            'return_url',
            'cancel_url',
            'notify_url',
        ];

        foreach ($required as $key) {
            if (
                trim(
                    (string) (
                        $this->config[
                            $key
                        ]
                        ?? ''
                    )
                ) === ''
            ) {
                throw new RuntimeException(
                    'PayFast is not fully configured.'
                );
            }
        }
    }

    private function positiveInt(
        mixed $value,
        string $field
    ): int {
        $validated =
            filter_var(
                $value,
                FILTER_VALIDATE_INT,
                [
                    'options' => [
                        'min_range' => 1,
                    ],
                ]
            );

        if ($validated === false) {
            throw new InvalidArgumentException(
                $field
                . ' must be a positive integer.'
            );
        }

        return (int) $validated;
    }
}
