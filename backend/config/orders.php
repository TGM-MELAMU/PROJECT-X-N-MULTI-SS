<?php

declare(strict_types=1);

return [
    /*
     * Conservative Phase 6 customer cancellation rule.
     * Easy to change later without rewriting the service.
     */
    'customer_cancellable_statuses' => [
        'new',
        'confirmed',
    ],

    'blocked_fulfillment_statuses' => [
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'completed',
        'cancelled',
    ],
];