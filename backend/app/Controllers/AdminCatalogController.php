<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Services\AdminCatalogService;

final class AdminCatalogController extends AdminManagementController
{
    private AdminCatalogService $catalog;

    public function __construct(?AdminCatalogService $catalog = null)
    {
        $this->catalog = $catalog ?? new AdminCatalogService();
    }

    public function products(Request $request): void
    {
        $this->respond(fn (): array => $this->catalog->products($request->query()));
    }

    public function product(int $id): void
    {
        $this->respond(fn (): array => $this->catalog->product($id));
    }

    public function productStatus(Request $request, int $id): void
    {
        $this->respond(fn (): array => $this->catalog->status($id, $request->body()), 'Product status updated.');
    }

    public function productCategories(Request $request, int $id): void
    {
        $this->respond(fn (): array => $this->catalog->productCategories($id, $request->body()), 'Product categories updated.');
    }

    public function categories(): void
    {
        $this->respond(fn (): array => $this->catalog->categories());
    }

    public function category(int $id): void
    {
        $this->respond(fn (): array => $this->catalog->category($id));
    }

    public function createCategory(Request $request): void
    {
        $this->respond(fn (): array => $this->catalog->createCategory($request->body()), 'Category created.', 201);
    }

    public function updateCategory(Request $request, int $id): void
    {
        $this->respond(fn (): array => $this->catalog->updateCategory($id, $request->body()), 'Category updated.');
    }
}
