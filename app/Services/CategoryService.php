<?php

declare(strict_types=1);

namespace MultiSS\Services;

use MultiSS\Repositories\CategoryRepository;

final class CategoryService
{
    private CategoryRepository $categoryRepository;

    public function __construct(
        ?CategoryRepository $categoryRepository = null
    ) {
        $this->categoryRepository =
            $categoryRepository ?? new CategoryRepository();
    }

    public function getPublicCategories(): array
    {
        $categories =
            $this->categoryRepository->findPublicCategories();

        return array_map(
            function (array $category): array {
                return [
                    'category_id' =>
                        (int) $category['category_id'],

                    'parent_category_id' =>
                        $category['parent_category_id'] === null
                            ? null
                            : (int) $category['parent_category_id'],

                    'category_name' =>
                        $category['category_name'],

                    'slug' =>
                        $category['slug'],

                    'description' =>
                        $category['description'],

                    'product_count' =>
                        (int) $category['product_count'],
                ];
            },
            $categories
        );
    }
}