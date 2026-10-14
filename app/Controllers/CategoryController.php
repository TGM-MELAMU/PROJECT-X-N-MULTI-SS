<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Services\CategoryService;

final class CategoryController
{
    private CategoryService $categoryService;

    public function __construct(
        ?CategoryService $categoryService = null
    ) {
        $this->categoryService =
            $categoryService ?? new CategoryService();
    }

    public function index(Request $request): void
    {
        $categories =
            $this->categoryService->getPublicCategories();

        Response::json([
            'success' => true,
            'data' => [
                'categories' => $categories,
            ],
        ], 200);
    }
}