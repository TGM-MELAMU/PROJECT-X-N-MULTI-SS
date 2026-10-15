<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Core\Logger;
use MultiSS\Repositories\AdminRepository;
use OutOfBoundsException;
use RuntimeException;

final class AdminService
{
    private AdminRepository $admin;

    public function __construct(
        ?AdminRepository $admin = null
    ) {
        $this->admin =
            $admin
            ?? new AdminRepository();
    }

    public function listUsers(
        array $query
    ): array {
        [$page, $perPage] =
            $this->pagination(
                $query
            );

        $search =
            isset($query['search'])
                ? trim(
                    (string) $query[
                        'search'
                    ]
                )
                : null;

        if ($search === '') {
            $search = null;
        }

        $result =
            $this->admin
                ->listUsers(
                    $page,
                    $perPage,
                    $search
                );

        return [
            'users' =>
                array_map(
                    fn (
                        array $user
                    ): array =>
                        $this->formatUser(
                            $user
                        ),
                    $result['rows']
                ),

            'roles' =>
                $this->admin
                    ->availableRoles(),

            'meta' =>
                $this->meta(
                    $page,
                    $perPage,
                    (int) $result[
                        'total'
                    ]
                ),
        ];
    }

    public function getUser(
        int $userId
    ): array {
        $this->positiveId(
            $userId,
            'User ID'
        );

        $user =
            $this->admin
                ->findUserById(
                    $userId
                );

        if ($user === null) {
            throw new OutOfBoundsException(
                'User not found.'
            );
        }

        return $this->formatUser(
            $user
        );
    }

    public function updateUser(
        array $currentAdmin,
        int $userId,
        array $data
    ): array {
        $this->getUser(
            $userId
        );

        $fields = [];
        $roles = null;

        if (
            array_key_exists(
                'first_name',
                $data
            )
        ) {
            $fields['first_name'] =
                $this->requiredString(
                    $data['first_name'],
                    'First name',
                    100
                );
        }

        if (
            array_key_exists(
                'last_name',
                $data
            )
        ) {
            $fields['last_name'] =
                $this->requiredString(
                    $data['last_name'],
                    'Last name',
                    100
                );
        }

        if (
            array_key_exists(
                'email',
                $data
            )
        ) {
            $email =
                strtolower(
                    trim(
                        (string) $data[
                            'email'
                        ]
                    )
                );

            if (
                $email === ''
                || filter_var(
                    $email,
                    FILTER_VALIDATE_EMAIL
                ) === false
                || strlen($email) > 255
            ) {
                throw new InvalidArgumentException(
                    'A valid email address is required.'
                );
            }

            if (
                $this->admin
                    ->emailExistsForAnotherUser(
                        $email,
                        $userId
                    )
            ) {
                throw new DomainException(
                    'That email address is already in use.'
                );
            }

            $fields['email'] =
                $email;
        }

        if (
            array_key_exists(
                'phone',
                $data
            )
        ) {
            $phone =
                trim(
                    (string) (
                        $data['phone']
                        ?? ''
                    )
                );

            if (strlen($phone) > 30) {
                throw new InvalidArgumentException(
                    'Phone may not exceed 30 characters.'
                );
            }

            $fields['phone'] =
                $phone === ''
                    ? null
                    : $phone;
        }

        if (
            array_key_exists(
                'status',
                $data
            )
        ) {
            $status =
                strtolower(
                    trim(
                        (string) $data[
                            'status'
                        ]
                    )
                );

            if (
                !in_array(
                    $status,
                    [
                        'active',
                        'inactive',
                    ],
                    true
                )
            ) {
                throw new InvalidArgumentException(
                    'User status must be active or inactive.'
                );
            }

            if (
                (int) $currentAdmin[
                    'user_id'
                ] === $userId
                && $status === 'inactive'
            ) {
                throw new DomainException(
                    'You cannot deactivate your own administrator account.'
                );
            }

            $fields['status'] =
                $status;
        }

        if (
            array_key_exists(
                'roles',
                $data
            )
        ) {
            if (
                !is_array(
                    $data['roles']
                )
            ) {
                throw new InvalidArgumentException(
                    'Roles must be an array.'
                );
            }

            $roles =
                array_values(
                    array_unique(
                        array_filter(
                            array_map(
                                static fn (
                                    mixed $role
                                ): string =>
                                    strtolower(
                                        trim(
                                            (string) $role
                                        )
                                    ),
                                $data['roles']
                            ),
                            static fn (
                                string $role
                            ): bool =>
                                $role !== ''
                        )
                    )
                );

            if ($roles === []) {
                throw new InvalidArgumentException(
                    'At least one role is required.'
                );
            }

            $available =
                $this->admin
                    ->availableRoles();

            foreach ($roles as $role) {
                if (
                    !in_array(
                        $role,
                        $available,
                        true
                    )
                ) {
                    throw new InvalidArgumentException(
                        'Unknown role: '
                        . $role
                    );
                }
            }

            if (
                (int) $currentAdmin[
                    'user_id'
                ] === $userId
                && !in_array(
                    'admin',
                    $roles,
                    true
                )
            ) {
                throw new DomainException(
                    'You cannot remove your own administrator role.'
                );
            }
        }

        if (
            $fields === []
            && $roles === null
        ) {
            throw new InvalidArgumentException(
                'No supported user fields were supplied.'
            );
        }

        $this->admin->updateUser(
            $userId,
            $fields,
            $roles
        );

        return $this->getUser(
            $userId
        );
    }

    public function archiveUser(
        array $currentAdmin,
        int $userId
    ): array {
        $this->getUser(
            $userId
        );

        if (
            (int) $currentAdmin[
                'user_id'
            ] === $userId
        ) {
            throw new DomainException(
                'You cannot archive your own administrator account.'
            );
        }

        $this->admin
            ->archiveUser(
                $userId
            );

        return $this->getUser(
            $userId
        );
    }

    public function triggerPasswordReset(
        int $userId
    ): array {
        $user =
            $this->getUser(
                $userId
            );

        $forgotPassword =
            new ForgotPasswordService();

        $result =
            $forgotPassword
                ->createTokenForEmail(
                    (string) $user[
                        'email'
                    ]
                );

        if (
            ($result['success'] ?? false)
            !== true
        ) {
            throw new DomainException(
                'Unable to create a password reset request.'
            );
        }

        $emailSent = false;

        if (
            ($result['send_email'] ?? false)
            === true
        ) {
            try {
                $email =
                    new EmailService();

                $email
                    ->sendPasswordResetEmail(
                        (string) $result[
                            'email'
                        ],
                        (string) $result[
                            'first_name'
                        ],
                        (string) $result[
                            'reset_token'
                        ]
                    );

                $emailSent = true;
            } catch (
                RuntimeException $exception
            ) {
                Logger::warning(
                    'Admin password reset email could not be sent.',
                    [
                        'user_id' =>
                            $userId,

                        'exception' =>
                            $exception::class,

                        'message' =>
                            $exception
                                ->getMessage(),
                    ]
                );
            }
        }

        return [
            'user_id' =>
                $userId,

            'reset_requested' =>
                true,

            'email_sent' =>
                $emailSent,
        ];
    }

    public function listOrders(
        array $query
    ): array {
        [$page, $perPage] =
            $this->pagination(
                $query
            );

        $search =
            isset($query['search'])
                ? trim(
                    (string) $query[
                        'search'
                    ]
                )
                : null;

        if ($search === '') {
            $search = null;
        }

        $status =
            isset($query['status'])
                ? strtolower(
                    trim(
                        (string) $query[
                            'status'
                        ]
                    )
                )
                : null;

        if ($status === '') {
            $status = null;
        }

        if (
            $status !== null
            && !in_array(
                $status,
                [
                    'pending_payment',
                    'payment_failed',
                    'new',
                    'confirmed',
                    'processing',
                    'completed',
                    'cancelled',
                ],
                true
            )
        ) {
            throw new InvalidArgumentException(
                'Invalid order status filter.'
            );
        }

        $result =
            $this->admin
                ->listOrders(
                    $page,
                    $perPage,
                    $search,
                    $status
                );

        return [
            'orders' =>
                $result['rows'],

            'meta' =>
                $this->meta(
                    $page,
                    $perPage,
                    (int) $result[
                        'total'
                    ]
                ),
        ];
    }

    public function getOrder(
        string $orderNumber
    ): array {
        $orderNumber =
            trim(
                $orderNumber
            );

        if (
            $orderNumber === ''
            || strlen($orderNumber) > 50
        ) {
            throw new InvalidArgumentException(
                'Invalid order number.'
            );
        }

        $order =
            $this->admin
                ->findOrderByNumber(
                    $orderNumber
                );

        if ($order === null) {
            throw new OutOfBoundsException(
                'Order not found.'
            );
        }

        return $order;
    }

    public function refundOrder(
        array $adminUser,
        string $orderNumber,
        array $data
    ): array {
        $this->getOrder(
            $orderNumber
        );

        $paymentId =
            $this->admin
                ->findRefundableDemoPayment(
                    $orderNumber
                );

        if ($paymentId === null) {
            throw new DomainException(
                'This order does not have a successful demo payment available for refund.'
            );
        }

        $payments =
            new PaymentService();

        return $payments
            ->refundDemoPayment(
                $adminUser,
                $paymentId,
                $data
            );
    }

    public function commissionRules():
        array
    {
        return [
            'rules' =>
                $this->admin
                    ->listCommissionRules(),
        ];
    }

    public function updateCommission(
        array $adminUser,
        array $data
    ): array {
        $categoryId =
            $this->optionalPositiveId(
                $data['category_id']
                    ?? null
            );

        $productId =
            $this->optionalPositiveId(
                $data['product_id']
                    ?? null
            );

        if (
            ($categoryId === null)
            === ($productId === null)
        ) {
            throw new InvalidArgumentException(
                'Provide exactly one of category_id or product_id.'
            );
        }

        if (
            !isset(
                $data[
                    'commission_percentage'
                ]
            )
            || !is_numeric(
                $data[
                    'commission_percentage'
                ]
            )
        ) {
            throw new InvalidArgumentException(
                'commission_percentage is required.'
            );
        }

        $percentage =
            (float) $data[
                'commission_percentage'
            ];

        if (
            $percentage < 0
            || $percentage > 100
        ) {
            throw new InvalidArgumentException(
                'Commission percentage must be between 0 and 100.'
            );
        }

        $status =
            strtolower(
                trim(
                    (string) (
                        $data['status']
                        ?? 'active'
                    )
                )
            );

        if (
            !in_array(
                $status,
                [
                    'active',
                    'inactive',
                ],
                true
            )
        ) {
            throw new InvalidArgumentException(
                'Commission status must be active or inactive.'
            );
        }

        if (
            $categoryId !== null
            && !$this->admin
                ->categoryExists(
                    $categoryId
                )
        ) {
            throw new OutOfBoundsException(
                'Category not found.'
            );
        }

        if (
            $productId !== null
            && !$this->admin
                ->productExists(
                    $productId
                )
        ) {
            throw new OutOfBoundsException(
                'Product not found.'
            );
        }

        $this->admin
            ->upsertCommissionRule(
                $categoryId,
                $productId,
                $percentage,
                $status,
                (int) $adminUser[
                    'user_id'
                ]
            );

        return
            $this->commissionRules();
    }

    public function deliveryRates():
        array
    {
        return [
            'rates' =>
                $this->admin
                    ->listDeliveryRates(),
        ];
    }

    public function createDeliveryRate(
        array $adminUser,
        array $data
    ): array {
        $rate =
            $this->validateDeliveryRate(
                $data
            );

        if (
            $rate['status'] === 'active'
            && $this->admin
                ->hasDeliveryOverlap(
                    $rate[
                        'delivery_method'
                    ],
                    $rate[
                        'min_distance_km'
                    ],
                    $rate[
                        'max_distance_km'
                    ]
                )
        ) {
            throw new DomainException(
                'The delivery distance bracket overlaps an existing active bracket.'
            );
        }

        $id =
            $this->admin
                ->createDeliveryRate(
                    $rate[
                        'delivery_method'
                    ],
                    $rate[
                        'min_distance_km'
                    ],
                    $rate[
                        'max_distance_km'
                    ],
                    $rate['price'],
                    $rate['status'],
                    (int) $adminUser[
                        'user_id'
                    ]
                );

        return [
            'rate' =>
                $this->admin
                    ->findDeliveryRate(
                        $id
                    ),
        ];
    }

    public function updateDeliveryRate(
        array $adminUser,
        int $deliveryRateId,
        array $data
    ): array {
        $this->positiveId(
            $deliveryRateId,
            'Delivery rate ID'
        );

        $existing =
            $this->admin
                ->findDeliveryRate(
                    $deliveryRateId
                );

        if ($existing === null) {
            throw new OutOfBoundsException(
                'Delivery rate not found.'
            );
        }

        $merged = [
            'delivery_method' =>
                $data[
                    'delivery_method'
                ]
                ?? $existing[
                    'delivery_method'
                ],

            'min_distance_km' =>
                $data[
                    'min_distance_km'
                ]
                ?? $existing[
                    'min_distance_km'
                ],

            'max_distance_km' =>
                array_key_exists(
                    'max_distance_km',
                    $data
                )
                    ? $data[
                        'max_distance_km'
                    ]
                    : $existing[
                        'max_distance_km'
                    ],

            'price' =>
                $data['price']
                ?? $existing['price'],

            'status' =>
                $data['status']
                ?? $existing['status'],
        ];

        $rate =
            $this->validateDeliveryRate(
                $merged
            );

        if (
            $rate['status'] === 'active'
            && $this->admin
                ->hasDeliveryOverlap(
                    $rate[
                        'delivery_method'
                    ],
                    $rate[
                        'min_distance_km'
                    ],
                    $rate[
                        'max_distance_km'
                    ],
                    $deliveryRateId
                )
        ) {
            throw new DomainException(
                'The delivery distance bracket overlaps an existing active bracket.'
            );
        }

        $this->admin
            ->updateDeliveryRate(
                $deliveryRateId,
                $rate[
                    'delivery_method'
                ],
                $rate[
                    'min_distance_km'
                ],
                $rate[
                    'max_distance_km'
                ],
                $rate['price'],
                $rate['status'],
                (int) $adminUser[
                    'user_id'
                ]
            );

        return [
            'rate' =>
                $this->admin
                    ->findDeliveryRate(
                        $deliveryRateId
                    ),
        ];
    }

    public function archiveDeliveryRate(
        int $deliveryRateId
    ): array {
        $this->positiveId(
            $deliveryRateId,
            'Delivery rate ID'
        );

        if (
            $this->admin
                ->findDeliveryRate(
                    $deliveryRateId
                )
            === null
        ) {
            throw new OutOfBoundsException(
                'Delivery rate not found.'
            );
        }

        $this->admin
            ->archiveDeliveryRate(
                $deliveryRateId
            );

        return [
            'rate' =>
                $this->admin
                    ->findDeliveryRate(
                        $deliveryRateId
                    ),
        ];
    }

    public function collectionLocation():
        array
    {
        return [
            'collection_location' =>
                $this->admin
                    ->findActiveCollectionLocation(),
        ];
    }

    public function updateCollectionLocation(
        array $adminUser,
        array $data
    ): array {
        $existing =
            $this->admin
                ->findActiveCollectionLocation();

        $location = [
            'location_name' =>
                $data['location_name']
                ?? $existing[
                    'location_name'
                ]
                ?? null,

            'contact_number' =>
                array_key_exists(
                    'contact_number',
                    $data
                )
                    ? $data[
                        'contact_number'
                    ]
                    : (
                        $existing[
                            'contact_number'
                        ]
                        ?? null
                    ),

            'address_line_1' =>
                $data[
                    'address_line_1'
                ]
                ?? $existing[
                    'address_line_1'
                ]
                ?? null,

            'address_line_2' =>
                array_key_exists(
                    'address_line_2',
                    $data
                )
                    ? $data[
                        'address_line_2'
                    ]
                    : (
                        $existing[
                            'address_line_2'
                        ]
                        ?? null
                    ),

            'city' =>
                $data['city']
                ?? $existing['city']
                ?? null,

            'province' =>
                $data['province']
                ?? $existing[
                    'province'
                ]
                ?? null,

            'postal_code' =>
                $data['postal_code']
                ?? $existing[
                    'postal_code'
                ]
                ?? null,

            'country' =>
                $data['country']
                ?? $existing[
                    'country'
                ]
                ?? 'South Africa',
        ];

        $location['location_name'] =
            $this->requiredString(
                $location[
                    'location_name'
                ],
                'Location name',
                150
            );

        $location['address_line_1'] =
            $this->requiredString(
                $location[
                    'address_line_1'
                ],
                'Address line 1',
                150
            );

        $location['city'] =
            $this->requiredString(
                $location['city'],
                'City',
                100
            );

        $location['province'] =
            $this->requiredString(
                $location['province'],
                'Province',
                100
            );

        $location['postal_code'] =
            $this->requiredString(
                $location[
                    'postal_code'
                ],
                'Postal code',
                20
            );

        $location['country'] =
            $this->requiredString(
                $location['country'],
                'Country',
                100
            );

        $contact =
            trim(
                (string) (
                    $location[
                        'contact_number'
                    ]
                    ?? ''
                )
            );

        if (strlen($contact) > 30) {
            throw new InvalidArgumentException(
                'Contact number may not exceed 30 characters.'
            );
        }

        $location['contact_number'] =
            $contact === ''
                ? null
                : $contact;

        $line2 =
            trim(
                (string) (
                    $location[
                        'address_line_2'
                    ]
                    ?? ''
                )
            );

        if (strlen($line2) > 150) {
            throw new InvalidArgumentException(
                'Address line 2 may not exceed 150 characters.'
            );
        }

        $location['address_line_2'] =
            $line2 === ''
                ? null
                : $line2;

        $this->admin
            ->saveCollectionLocation(
                $location,
                (int) $adminUser[
                    'user_id'
                ]
            );

        return
            $this->collectionLocation();
    }

    private function validateDeliveryRate(
        array $data
    ): array {
        $method =
            strtolower(
                trim(
                    (string) (
                        $data[
                            'delivery_method'
                        ]
                        ?? ''
                    )
                )
            );

        if (
            !in_array(
                $method,
                [
                    'standard',
                    'express',
                ],
                true
            )
        ) {
            throw new InvalidArgumentException(
                'delivery_method must be standard or express.'
            );
        }

        if (
            !isset(
                $data[
                    'min_distance_km'
                ]
            )
            || !is_numeric(
                $data[
                    'min_distance_km'
                ]
            )
        ) {
            throw new InvalidArgumentException(
                'min_distance_km is required.'
            );
        }

        $min =
            (float) $data[
                'min_distance_km'
            ];

        if ($min < 0) {
            throw new InvalidArgumentException(
                'Minimum distance cannot be negative.'
            );
        }

        $maxRaw =
            $data[
                'max_distance_km'
            ]
            ?? null;

        $max = null;

        if (
            $maxRaw !== null
            && $maxRaw !== ''
        ) {
            if (
                !is_numeric(
                    $maxRaw
                )
            ) {
                throw new InvalidArgumentException(
                    'max_distance_km must be numeric or null.'
                );
            }

            $max =
                (float) $maxRaw;

            if ($max < $min) {
                throw new InvalidArgumentException(
                    'Maximum distance cannot be less than minimum distance.'
                );
            }
        }

        if (
            !isset($data['price'])
            || !is_numeric(
                $data['price']
            )
        ) {
            throw new InvalidArgumentException(
                'Delivery price is required.'
            );
        }

        $price =
            (float) $data[
                'price'
            ];

        if ($price < 0) {
            throw new InvalidArgumentException(
                'Delivery price cannot be negative.'
            );
        }

        $status =
            strtolower(
                trim(
                    (string) (
                        $data['status']
                        ?? 'active'
                    )
                )
            );

        if (
            !in_array(
                $status,
                [
                    'active',
                    'inactive',
                ],
                true
            )
        ) {
            throw new InvalidArgumentException(
                'Delivery rate status must be active or inactive.'
            );
        }

        return [
            'delivery_method' =>
                $method,

            'min_distance_km' =>
                $min,

            'max_distance_km' =>
                $max,

            'price' =>
                $price,

            'status' =>
                $status,
        ];
    }

    private function pagination(
        array $query
    ): array {
        $page =
            isset($query['page'])
            && is_numeric(
                $query['page']
            )
                ? max(
                    1,
                    (int) $query[
                        'page'
                    ]
                )
                : 1;

        $perPage =
            isset(
                $query['per_page']
            )
            && is_numeric(
                $query['per_page']
            )
                ? min(
                    100,
                    max(
                        1,
                        (int) $query[
                            'per_page'
                        ]
                    )
                )
                : 20;

        return [
            $page,
            $perPage,
        ];
    }

    private function meta(
        int $page,
        int $perPage,
        int $total
    ): array {
        return [
            'page' =>
                $page,

            'per_page' =>
                $perPage,

            'total' =>
                $total,

            'total_pages' =>
                $total === 0
                    ? 0
                    : (int) ceil(
                        $total
                        / $perPage
                    ),
        ];
    }

    private function formatUser(
        array $user
    ): array {
        $roles =
            trim(
                (string) (
                    $user[
                        'roles_csv'
                    ]
                    ?? ''
                )
            );

        unset(
            $user['roles_csv']
        );

        $user['user_id'] =
            (int) $user[
                'user_id'
            ];

        $user['email_verified'] =
            $user[
                'email_verified_at'
            ] !== null;

        $user['roles'] =
            $roles === ''
                ? []
                : explode(
                    ',',
                    $roles
                );

        return $user;
    }

    private function requiredString(
        mixed $value,
        string $label,
        int $maxLength
    ): string {
        $value =
            trim(
                (string) $value
            );

        if ($value === '') {
            throw new InvalidArgumentException(
                $label
                . ' is required.'
            );
        }

        if (
            strlen($value)
            > $maxLength
        ) {
            throw new InvalidArgumentException(
                $label
                . ' may not exceed '
                . $maxLength
                . ' characters.'
            );
        }

        return $value;
    }

    private function positiveId(
        int $value,
        string $label
    ): void {
        if ($value <= 0) {
            throw new InvalidArgumentException(
                $label
                . ' must be a positive integer.'
            );
        }
    }

    private function optionalPositiveId(
        mixed $value
    ): ?int {
        if (
            $value === null
            || $value === ''
        ) {
            return null;
        }

        $id =
            filter_var(
                $value,
                FILTER_VALIDATE_INT,
                [
                    'options' => [
                        'min_range' => 1,
                    ],
                ]
            );

        if ($id === false) {
            throw new InvalidArgumentException(
                'Invalid ID value.'
            );
        }

        return (int) $id;
    }
}