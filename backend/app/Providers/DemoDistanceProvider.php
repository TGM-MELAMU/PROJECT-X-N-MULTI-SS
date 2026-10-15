<?php

declare(strict_types=1);

namespace MultiSS\Providers;

use InvalidArgumentException;
use MultiSS\Contracts\DistanceProviderInterface;

final class DemoDistanceProvider
    implements DistanceProviderInterface
{
    private float $distanceKm;

    public function __construct(
        float $distanceKm
    ) {
        if ($distanceKm < 0) {
            throw new InvalidArgumentException(
                'Demo distance cannot be negative.'
            );
        }

        $this->distanceKm = $distanceKm;
    }

    public function distanceKm(
        array $address
    ): float {
        /*
         * Development/demo mechanism only.
         *
         * The customer cannot supply or manipulate
         * this value. A future real distance provider
         * can replace this class without changing
         * DeliveryService.
         */
        return $this->distanceKm;
    }
}