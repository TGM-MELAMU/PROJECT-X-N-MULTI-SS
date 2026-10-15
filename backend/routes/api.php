<?php

declare(strict_types=1);

use MultiSS\Controllers\PaymentController;
use MultiSS\Controllers\DemoPaymentController;
use MultiSS\Controllers\CartController;
use MultiSS\Controllers\AdminProductController;
use MultiSS\Controllers\AuthController;
use MultiSS\Controllers\CategoryController;
use MultiSS\Controllers\ProductController;
use MultiSS\Controllers\VendorProductController;
use MultiSS\Core\Database;
use MultiSS\Core\Logger;
use MultiSS\Core\Request;
use MultiSS\Core\Response;
use MultiSS\Core\Router;
use MultiSS\Middleware\AuthMiddleware;
use MultiSS\Middleware\CsrfMiddleware;
use MultiSS\Middleware\RoleMiddleware;
use MultiSS\Controllers\AddressController;
use MultiSS\Controllers\CheckoutController;
use MultiSS\Controllers\OrderController;

/** @var Router $router */

/*
|--------------------------------------------------------------------------
| Health
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/health',
    function (Request $request): void {
        try {
            $pdo = Database::connection();

            $pdo->query('SELECT 1');

            Response::json([
                'success' => true,
                'status' => 'healthy',
                'database' => 'connected',
            ], 200);
        } catch (Throwable $exception) {
            Logger::error(
                'Database health check failed',
                [
                    'type' => $exception::class,
                    'message' => $exception->getMessage(),
                ]
            );

            Response::json([
                'success' => false,
                'status' => 'unhealthy',
                'database' => 'disconnected',
            ], 503);
        }
    }
);

/*
|--------------------------------------------------------------------------
| Public Products
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/products',
    function (Request $request): void {
        $controller =
            new ProductController();

        $controller->index(
            $request
        );
    }
);

$router->get(
    '/api/v1/products/{slug}',
    function (
        Request $request,
        array $params
    ): void {
        $controller =
            new ProductController();

        $controller->show(
            $params['slug'] ?? ''
        );
    }
);

/*
|--------------------------------------------------------------------------
| Public Categories
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/categories',
    function (Request $request): void {
        $controller =
            new CategoryController();

        $controller->index(
            $request
        );
    }
);

/*
|--------------------------------------------------------------------------
| CSRF
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/csrf-token',
    function (Request $request): void {
        Response::json([
            'success' => true,
            'csrf_token' =>
                CsrfMiddleware::token(),
        ], 200);
    }
);

/*
|--------------------------------------------------------------------------
| Cart
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/cart',
    function (Request $request): void {
        $user = RoleMiddleware::handle(
            'customer'
        );

        if ($user === null) {
            return;
        }

        $controller =
            new CartController();

        $controller->index(
            $request,
            $user
        );
    }
);

/*
 * Clear the authenticated customer's entire cart.
 */
$router->delete(
    '/api/v1/cart',
    function (Request $request): void {
        $user = RoleMiddleware::handle(
            'customer'
        );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new CartController();

        $controller->clear(
            $user
        );
    }
);

$router->post(
    '/api/v1/cart/items',
    function (Request $request): void {
        $user = RoleMiddleware::handle(
            'customer'
        );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new CartController();

        $controller->store(
            $request,
            $user
        );
    }
);

$router->patch(
    '/api/v1/cart/items/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $user = RoleMiddleware::handle(
            'customer'
        );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $cartItemId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        $controller =
            new CartController();

        $controller->update(
            $request,
            $user,
            $cartItemId
        );
    }
);

$router->delete(
    '/api/v1/cart/items/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $user = RoleMiddleware::handle(
            'customer'
        );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $cartItemId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        $controller =
            new CartController();

        $controller->destroy(
            $user,
            $cartItemId
        );
    }
);

/*
|--------------------------------------------------------------------------
| Addresses
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/addresses',
    function (Request $request): void {
        $user = AuthMiddleware::handle();

        if ($user === null) {
            return;
        }

        $controller =
            new AddressController();

        $controller->index(
            $request,
            $user
        );
    }
);

$router->post(
    '/api/v1/addresses',
    function (Request $request): void {
        $user = AuthMiddleware::handle();

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new AddressController();

        $controller->store(
            $request,
            $user
        );
    }
);

/*
|--------------------------------------------------------------------------
| Checkout
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/checkout/summary',
    function (Request $request): void {
        $user =
            AuthMiddleware::handle();

        if ($user === null) {
            return;
        }

        $controller =
            new CheckoutController();

        $controller->summary(
            $request,
            $user
        );
    }
);

$router->post(
    '/api/v1/checkout/orders',
    function (Request $request): void {
        $user =
            AuthMiddleware::handle();

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new CheckoutController();

        $controller->createOrder(
            $request,
            $user
        );
    }
);

/*
|--------------------------------------------------------------------------
| Vendor Products
|--------------------------------------------------------------------------
*/

$router->post(
    '/api/v1/vendor/products',
    function (Request $request): void {
        $user =
            AuthMiddleware::handle();

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new VendorProductController();

        $controller->store(
            $request,
            $user
        );
    }
);

$router->patch(
    '/api/v1/vendor/products/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $user =
            AuthMiddleware::handle();

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $productId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        $controller =
            new VendorProductController();

        $controller->update(
            $request,
            $user,
            $productId
        );
    }
);

/*
|--------------------------------------------------------------------------
| Admin Product Approval
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/admin/products/pending',
    function (Request $request): void {
        $user =
            RoleMiddleware::handle(
                'admin'
            );

        if ($user === null) {
            return;
        }

        $controller =
            new AdminProductController();

        $controller->pending(
            $request
        );
    }
);

$router->post(
    '/api/v1/admin/products/{id}/approve',
    function (
        Request $request,
        array $params
    ): void {
        $user =
            RoleMiddleware::handle(
                'admin'
            );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $productId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        $controller =
            new AdminProductController();

        $controller->approve(
            $user,
            $productId
        );
    }
);

$router->post(
    '/api/v1/admin/products/{id}/reject',
    function (
        Request $request,
        array $params
    ): void {
        $user =
            RoleMiddleware::handle(
                'admin'
            );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $productId =
            isset($params['id'])
            && ctype_digit(
                (string) $params['id']
            )
                ? (int) $params['id']
                : 0;

        $controller =
            new AdminProductController();

        $controller->reject(
            $request,
            $user,
            $productId
        );
    }
);

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

$router->post(
    '/api/v1/auth/verify-email',
    function (Request $request): void {
        $controller =
            new AuthController();

        $controller->verifyEmail(
            $request
        );
    }
);

$router->post(
    '/api/v1/auth/resend-verification',
    function (Request $request): void {
        $controller =
            new AuthController();

        $controller->resendVerification(
            $request
        );
    }
);

$router->post(
    '/api/v1/auth/login',
    function (Request $request): void {
        $controller =
            new AuthController();

        $controller->login(
            $request
        );
    }
);

$router->get(
    '/api/v1/auth/me',
    function (Request $request): void {
        $controller =
            new AuthController();

        $controller->me(
            $request
        );
    }
);

$router->post(
    '/api/v1/auth/logout',
    function (Request $request): void {
        $controller =
            new AuthController();

        $controller->logout(
            $request
        );
    }
);

$router->post(
    '/api/v1/auth/forgot-password',
    function (Request $request): void {
        $controller =
            new AuthController();

        $controller->forgotPassword(
            $request
        );
    }
);

$router->post(
    '/api/v1/auth/reset-password',
    function (Request $request): void {
        $controller =
            new AuthController();

        $controller->resetPassword(
            $request
        );
    }
);

$router->post(
    '/api/v1/auth/register',
    function (Request $request): void {
        $controller =
            new AuthController();

        $controller->register(
            $request
        );
    }
);

/*
|--------------------------------------------------------------------------
| Orders
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/orders/{orderNumber}',
    function (
        Request $request,
        array $params
    ): void {
        $user =
            AuthMiddleware::handle();

        if ($user === null) {
            return;
        }

        $orderNumber =
            isset(
                $params[
                    'orderNumber'
                ]
            )
                ? trim(
                    (string) $params[
                        'orderNumber'
                    ]
                )
                : '';

        $controller =
            new OrderController();

        $controller->show(
            $user,
            $orderNumber
        );
    }
);

/*
|--------------------------------------------------------------------------
| Payments - PayFast
|--------------------------------------------------------------------------
*/

$router->post(
    '/api/v1/payments/payfast',
    function (Request $request): void {
        $user =
            AuthMiddleware::handle();

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new PaymentController();

        $controller->createPayFastRequest(
            $request,
            $user
        );
    }
);

$router->get(
    '/api/v1/payments/payfast/return',
    function (Request $request): void {
        $controller =
            new PaymentController();

        $controller->returnFromPayFast(
            $request
        );
    }
);

$router->get(
    '/api/v1/payments/payfast/cancel',
    function (Request $request): void {
        $controller =
            new PaymentController();

        $controller->cancelPayFast(
            $request
        );
    }
);

$router->post(
    '/api/v1/payments/payfast/notify',
    function (Request $request): void {
        /*
         * PayFast is the caller here.
         *
         * No user authentication.
         * No CSRF validation.
         *
         * Security is handled by the PayFast
         * signature/source/amount/server checks.
         */

        $controller =
            new PaymentController();

        $controller->notifyPayFast(
            $request
        );
    }
);
/*
|--------------------------------------------------------------------------
| Phase 6 - Checkout Quote
|--------------------------------------------------------------------------
*/

$router->post(
    '/api/v1/checkout/quote',
    function (Request $request): void {
        $user =
            RoleMiddleware::handle(
                'customer'
            );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new CheckoutController();

        $controller->quote(
            $request,
            $user
        );
    }
);
/*
|--------------------------------------------------------------------------
| Phase 6 - Customer Order History
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/orders',
    function (Request $request): void {
        $user =
            RoleMiddleware::handle(
                'customer'
            );

        if ($user === null) {
            return;
        }

        $controller =
            new OrderController();

        $controller->index(
            $request,
            $user
        );
    }
);
$router->post(
    '/api/v1/orders/{orderNumber}/cancel',
    function (
        Request $request,
        array $params
    ): void {
        $user =
            RoleMiddleware::handle(
                'customer'
            );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $orderNumber =
            trim(
                (string) (
                    $params['orderNumber']
                    ?? ''
                )
            );

        $controller =
            new OrderController();

        $controller->cancel(
            $user,
            $orderNumber
        );
    }
);
$router->post(
    '/api/v1/checkout/validate',
    function (Request $request): void {
        $user =
            RoleMiddleware::handle(
                'customer'
            );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new CheckoutController();

        $controller->summary(
            $request,
            $user
        );
    }
);
$router->post(
    '/api/v1/checkout/create-order',
    function (Request $request): void {
        $user =
            RoleMiddleware::handle(
                'customer'
            );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new CheckoutController();

        $controller->createOrder(
            $request,
            $user
        );
    }
);
/*
|--------------------------------------------------------------------------
| Phase 7 - Demo Payments
|--------------------------------------------------------------------------
*/

$router->get(
    '/api/v1/payments/{id}',
    function (
        Request $request,
        array $params
    ): void {
        $user =
            RoleMiddleware::handle(
                'customer'
            );

        if ($user === null) {
            return;
        }

        $controller =
            new DemoPaymentController();

        $controller->show(
            $user,
            (string) (
                $params['id']
                ?? ''
            )
        );
    }
);

$router->post(
    '/api/v1/payments/demo/process',
    function (Request $request): void {
        $user =
            RoleMiddleware::handle(
                'customer'
            );

        if ($user === null) {
            return;
        }

        CsrfMiddleware::validate(
            $request
        );

        $controller =
            new DemoPaymentController();

        $controller->process(
            $request,
            $user
        );
    }
);

$router->post(
    '/api/v1/payments/webhook',
    function (Request $request): void {
        /*
         * Server-to-server callback.
         * Authentication is performed by the
         * payment gateway signature.
         */
        $controller =
            new DemoPaymentController();

        $controller->webhook(
            $request
        );
    }
);

$router->post(
    '/api/v1/admin/payments/{id}/refund',
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

        $controller =
            new DemoPaymentController();

        $controller->refund(
            $request,
            $admin,
            (string) (
                $params['id']
                ?? ''
            )
        );
    }
);

require_once __DIR__ . '/admin.php';
require_once __DIR__ . '/phase9_10.php';
