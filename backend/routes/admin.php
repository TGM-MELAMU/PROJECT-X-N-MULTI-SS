<?php

declare(strict_types=1);

use MultiSS\Controllers\AdminCatalogController;
use MultiSS\Controllers\AdminInventoryController;
use MultiSS\Controllers\AdminVendorController;
use MultiSS\Controllers\AdminOrderController;
use MultiSS\Controllers\AdminSettingsController;
use MultiSS\Controllers\AdminUserController;
use MultiSS\Core\Request;
use MultiSS\Middleware\CsrfMiddleware;
use MultiSS\Middleware\RoleMiddleware;

/*
|--------------------------------------------------------------------------
| Phase 8 Administrator Routes
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/admin/users',
    function (
        Request $request
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        (new AdminUserController())
            ->index(
                $request
            );
    }
);

$router->get(
    '/api/v1/admin/users/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        $userId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        (new AdminUserController())
            ->show(
                $userId
            );
    }
);

$router->patch(
    '/api/v1/admin/users/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $userId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        (new AdminUserController())
            ->update(
                $request,
                $admin,
                $userId
            );
    }
);

$router->delete(
    '/api/v1/admin/users/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $userId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        (new AdminUserController())
            ->destroy(
                $admin,
                $userId
            );
    }
);

$router->post(
    '/api/v1/admin/users/{id}/reset-password',
    function (
        Request $request,
        array $params
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $userId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        (new AdminUserController())
            ->resetPassword(
                $userId
            );
    }
);

$router->get(
    '/api/v1/admin/orders',
    function (
        Request $request
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        (new AdminOrderController())
            ->index(
                $request
            );
    }
);

$router->get(
    '/api/v1/admin/orders/{orderNumber}',
    function (
        Request $request,
        array $params
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        (new AdminOrderController())
            ->show(
                trim(
                    (string) (
                        $params[
                            'orderNumber'
                        ]
                        ?? ''
                    )
                )
            );
    }
);

$router->post(
    '/api/v1/admin/orders/{orderNumber}/refund',
    function (
        Request $request,
        array $params
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        (new AdminOrderController())
            ->refund(
                $request,
                $admin,
                trim(
                    (string) (
                        $params[
                            'orderNumber'
                        ]
                        ?? ''
                    )
                )
            );
    }
);

$router->get(
    '/api/v1/admin/settings/commission',
    function (
        Request $request
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        (new AdminSettingsController())
            ->commissionIndex();
    }
);

$router->patch(
    '/api/v1/admin/settings/commission',
    function (
        Request $request
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        (new AdminSettingsController())
            ->commissionUpdate(
                $request,
                $admin
            );
    }
);

$router->get(
    '/api/v1/admin/settings/delivery',
    function (
        Request $request
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        (new AdminSettingsController())
            ->deliveryIndex();
    }
);

$router->post(
    '/api/v1/admin/settings/delivery',
    function (
        Request $request
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        (new AdminSettingsController())
            ->deliveryStore(
                $request,
                $admin
            );
    }
);

$router->patch(
    '/api/v1/admin/settings/delivery/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $id =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        (new AdminSettingsController())
            ->deliveryUpdate(
                $request,
                $admin,
                $id
            );
    }
);

$router->delete(
    '/api/v1/admin/settings/delivery/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $id =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        (new AdminSettingsController())
            ->deliveryDestroy(
                $id
            );
    }
);

$router->get(
    '/api/v1/admin/settings/collection',
    function (
        Request $request
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        (new AdminSettingsController())
            ->collectionShow();
    }
);

$router->patch(
    '/api/v1/admin/settings/collection',
    function (
        Request $request
    ): void {
        $admin =
            RoleMiddleware::handle(
                'admin'
            );

        if ($admin === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        (new AdminSettingsController())
            ->collectionUpdate(
                $request,
                $admin
            );
    }
);


/* Phase 8 Catalog, Inventory and Vendor Routes */

$router->get(
    '/api/v1/admin/products',
    function (Request $request): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        (new AdminCatalogController())->products($request);
    }
);

$router->get(
    '/api/v1/admin/products/{id}',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminCatalogController())->product($id);
    }
);

$router->patch(
    '/api/v1/admin/products/{id}/status',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        CsrfMiddleware::validate($request);
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminCatalogController())->productStatus($request, $id);
    }
);

$router->put(
    '/api/v1/admin/products/{id}/categories',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        CsrfMiddleware::validate($request);
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminCatalogController())->productCategories($request, $id);
    }
);

$router->get(
    '/api/v1/admin/categories',
    function (Request $request): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        (new AdminCatalogController())->categories();
    }
);

$router->post(
    '/api/v1/admin/categories',
    function (Request $request): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        CsrfMiddleware::validate($request);
        (new AdminCatalogController())->createCategory($request);
    }
);

$router->get(
    '/api/v1/admin/categories/{id}',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminCatalogController())->category($id);
    }
);

$router->patch(
    '/api/v1/admin/categories/{id}',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        CsrfMiddleware::validate($request);
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminCatalogController())->updateCategory($request, $id);
    }
);

$router->get(
    '/api/v1/admin/inventory',
    function (Request $request): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        (new AdminInventoryController())->index($request);
    }
);

$router->get(
    '/api/v1/admin/inventory/{id}',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminInventoryController())->show($id);
    }
);

$router->get(
    '/api/v1/admin/inventory/{id}/movements',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminInventoryController())->movements($request, $id);
    }
);

$router->post(
    '/api/v1/admin/inventory/{id}/adjust',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        CsrfMiddleware::validate($request);
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminInventoryController())->adjust($request, $admin, $id);
    }
);

$router->get(
    '/api/v1/admin/vendors',
    function (Request $request): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        (new AdminVendorController())->index($request);
    }
);

$router->get(
    '/api/v1/admin/vendors/{id}',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminVendorController())->show($id);
    }
);

$router->patch(
    '/api/v1/admin/vendors/{id}/status',
    function (Request $request, array $params): void {
        $admin = RoleMiddleware::handle('admin');
        if ($admin === null) { return; }
        CsrfMiddleware::validate($request);
        $parsed = filter_var($params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $id = $parsed === false ? 0 : (int) $parsed;
        (new AdminVendorController())->status($request, $id);
    }
);
