<?php

declare(strict_types=1);

namespace MultiSS\Services;

use DomainException;
use InvalidArgumentException;
use MultiSS\Repositories\AdminCatalogRepository;
use OutOfBoundsException;

final class AdminCatalogService
{
    private AdminCatalogRepository $repo;

    public function __construct(?AdminCatalogRepository $repo = null)
    {
        $this->repo = $repo ?? new AdminCatalogRepository();
    }

    public function products(array $query): array
    {
        $page = $this->integer($query['page'] ?? 1, 'page');
        $limit = $this->integer($query['limit'] ?? 25, 'limit');
        if ($limit > 100 || $page > 100000) {
            throw new InvalidArgumentException('Pagination is out of range.');
        }
        $approval = $this->filter($query, 'approval_status', ['pending', 'approved', 'rejected']);
        $status = $this->filter($query, 'product_status', ['draft', 'active', 'inactive']);
        $vendor = isset($query['vendor_id']) ? $this->integer($query['vendor_id'], 'vendor_id') : null;
        $result = $this->repo->products($limit, ($page - 1) * $limit, $approval, $status, $vendor);
        return $result + ['page' => $page, 'limit' => $limit];
    }

    public function product(int $id): array
    {
        $product = $this->repo->product($this->integer($id, 'product_id'));
        if ($product === null) {
            throw new OutOfBoundsException('Product not found.');
        }
        return ['product' => $product];
    }

    public function status(int $id, array $data): array
    {
        $product = $this->product($id)['product'];
        $status = $data['status'] ?? null;
        if (!is_string($status) || !in_array($status, ['active', 'inactive'], true)) {
            throw new InvalidArgumentException('status must be active or inactive.');
        }
        if ($product['approval_status'] !== 'approved') {
            throw new DomainException('Only approved products may be activated or deactivated.');
        }
        $this->repo->updateProductStatus($id, $status);
        return $this->product($id);
    }

    public function categories(): array
    {
        return ['categories' => $this->repo->categories()];
    }

    public function category(int $id): array
    {
        $category = $this->repo->category($this->integer($id, 'category_id'));
        if ($category === null) {
            throw new OutOfBoundsException('Category not found.');
        }
        return ['category' => $category];
    }

    public function createCategory(array $data): array
    {
        [$name, $slug, $description, $parent] = $this->categoryFields($data);
        if ($this->repo->slugTaken($slug)) {
            throw new DomainException('Category slug already exists.');
        }
        $id = $this->repo->createCategory($name, $slug, $description, $parent);
        return $this->category($id);
    }

    public function updateCategory(int $id, array $data): array
    {
        $current = $this->category($id)['category'];
        $merged = array_merge($current, $data);
        [$name, $slug, $description, $parent] = $this->categoryFields($merged);
        $status = $merged['status'];
        if (!is_string($status) || !in_array($status, ['active', 'inactive'], true)) {
            throw new InvalidArgumentException('status must be active or inactive.');
        }
        if ($parent === $id) {
            throw new InvalidArgumentException('Category cannot be its own parent.');
        }
        $seen = [$id => true];
        $cursor = $parent;
        while ($cursor !== null) {
            if (isset($seen[$cursor])) {
                throw new InvalidArgumentException('Category parent cycle detected.');
            }
            $seen[$cursor] = true;
            $next = $this->repo->category($cursor);
            if ($next === null) {
                throw new InvalidArgumentException('Parent category does not exist.');
            }
            $cursor = $next['parent_category_id'] === null ? null : (int) $next['parent_category_id'];
        }
        if ($this->repo->slugTaken($slug, $id)) {
            throw new DomainException('Category slug already exists.');
        }
        $this->repo->updateCategory($id, $name, $slug, $description, $parent, $status);
        return $this->category($id);
    }

    public function productCategories(int $id, array $data): array
    {
        $this->product($id);
        $ids = $data['category_ids'] ?? null;
        if (!is_array($ids) || count($ids) > 30 || !array_is_list($ids)) {
            throw new InvalidArgumentException('category_ids must be a list of up to 30 IDs.');
        }
        $normalized = array_map(fn ($x): int => $this->integer($x, 'category_id'), $ids);
        if (count($normalized) !== count(array_unique($normalized))) {
            throw new InvalidArgumentException('Duplicate category IDs are not allowed.');
        }
        $this->repo->replaceCategories($id, $normalized);
        return ['product_id' => $id, 'category_ids' => $normalized];
    }

    private function categoryFields(array $data): array
    {
        $name = $data['category_name'] ?? null;
        $slug = $data['slug'] ?? null;
        if (!is_string($name) || trim($name) === '' || mb_strlen(trim($name)) > 100) {
            throw new InvalidArgumentException('category_name must be between 1 and 100 characters.');
        }
        if (!is_string($slug) || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) || strlen($slug) > 120) {
            throw new InvalidArgumentException('slug must be lowercase, alphanumeric and hyphenated (max 120).');
        }
        $description = $data['description'] ?? null;
        if ($description !== null && (!is_string($description) || mb_strlen($description) > 20000)) {
            throw new InvalidArgumentException('description must be text of at most 20000 characters.');
        }
        $parent = $data['parent_category_id'] ?? null;
        $parent = $parent === null ? null : $this->integer($parent, 'parent_category_id');
        if ($parent !== null && $this->repo->category($parent) === null) {
            throw new InvalidArgumentException('Parent category does not exist.');
        }
        return [trim($name), $slug, $description, $parent];
    }

    private function filter(array $query, string $key, array $options): ?string
    {
        if (!isset($query[$key]) || $query[$key] === '') {
            return null;
        }
        if (!is_string($query[$key]) || !in_array($query[$key], $options, true)) {
            throw new InvalidArgumentException('Invalid ' . $key . ' filter.');
        }
        return $query[$key];
    }

    private function integer(mixed $value, string $field): int
    {
        $number = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($number === false) {
            throw new InvalidArgumentException($field . ' must be a positive integer.');
        }
        return (int) $number;
    }
}
