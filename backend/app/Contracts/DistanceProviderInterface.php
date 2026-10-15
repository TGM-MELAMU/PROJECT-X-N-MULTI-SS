<?php

declare(strict_types=1);

namespace MultiSS\Contracts;

interface DistanceProviderInterface
{
    public function distanceKm(
        array $address
    ): float;
}