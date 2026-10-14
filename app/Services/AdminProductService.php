<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Repositories\AdminProductRepository;
use OutOfBoundsException;

final class AdminProductService
{
    private AdminProductRepository $products;

    public function __construct(
        ?AdminProductRepository $products = null
    ) {
        $this->products =
            $products ?? new AdminProductRepository();
    }

    public function getPendingProducts(): array
    {
        return $this->products->findPendingProducts();
    }

    public function approve(
        int $productId,
        int $reviewerId
    ): array {
        $product =
            $this->products->findById(
                $productId
            );

        if ($product === null) {
            throw new OutOfBoundsException(
                'Product not found.'
            );
        }

        if ($product['approval_status'] !== 'pending') {
            throw new DomainException(
                'Only pending products can be approved.'
            );
        }

        $this->products->approve(
            $productId,
            $reviewerId
        );

        return $this->products->findById(
            $productId
        ) ?? [];
    }

    public function reject(
        int $productId,
        int $reviewerId,
        mixed $reason
    ): array {
        $product =
            $this->products->findById(
                $productId
            );

        if ($product === null) {
            throw new OutOfBoundsException(
                'Product not found.'
            );
        }

        if ($product['approval_status'] !== 'pending') {
            throw new DomainException(
                'Only pending products can be rejected.'
            );
        }

        $reason = trim((string) $reason);

        if ($reason === '') {
            throw new InvalidArgumentException(
                'A rejection reason is required.'
            );
        }

        if (strlen($reason) > 500) {
            throw new InvalidArgumentException(
                'The rejection reason may not exceed 500 characters.'
            );
        }

        $this->products->reject(
            $productId,
            $reviewerId,
            $reason
        );

        return $this->products->findById(
            $productId
        ) ?? [];
    }
}