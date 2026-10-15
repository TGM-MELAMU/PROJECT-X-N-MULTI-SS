<?php

declare(strict_types=1);

use MultiSS\Controllers\NotificationController;
use MultiSS\Controllers\VendorApplicationController;
use MultiSS\Controllers\VendorController;
use MultiSS\Controllers\VendorOrderController;
use MultiSS\Controllers\VendorFinanceController;
use MultiSS\Core\Request;
use MultiSS\Middleware\AuthMiddleware;
use MultiSS\Middleware\CsrfMiddleware;
use MultiSS\Middleware\RoleMiddleware;

/** Phase 9/10 APIs; all writes require a logged-in session and CSRF token. */
$id = static function (array $params, string $key): int {
    $raw = $params[$key] ?? null;
    $parsed = filter_var($raw,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
    return $parsed === false ? 0 : (int)$parsed;
};

$router->get('/api/v1/vendor/applications',static function(Request $request): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new VendorApplicationController())->mine($user);
});
$router->post('/api/v1/vendor/applications',static function(Request $request): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    CsrfMiddleware::validate($request);
    (new VendorApplicationController())->submit($request,$user);
});
$router->get('/api/v1/admin/vendor-applications',static function(Request $request): void {
    $admin = RoleMiddleware::handle('admin');
    if ($admin === null) { return; }
    (new VendorApplicationController())->adminIndex($request);
});
$router->patch('/api/v1/admin/vendor-applications/{id}/review',static function(Request $request,array $params) use ($id): void {
    $admin = RoleMiddleware::handle('admin');
    if ($admin === null) { return; }
    CsrfMiddleware::validate($request);
    (new VendorApplicationController())->review($request,$admin,$id($params,'id'));
});

$router->get('/api/v1/vendor/me',static function(Request $request): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new VendorController())->mine($user);
});
$router->get('/api/v1/vendor/{vendorId}/products',static function(Request $request,array $params) use ($id): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new VendorController())->products($request,$user,$id($params,'vendorId'));
});
$router->get('/api/v1/vendor/{vendorId}/inventory',static function(Request $request,array $params) use ($id): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new VendorController())->inventory($request,$user,$id($params,'vendorId'));
});
$router->get('/api/v1/vendor/{vendorId}/orders',static function(Request $request,array $params) use ($id): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new VendorOrderController())->index($request,$user,$id($params,'vendorId'));
});
$router->get('/api/v1/vendor/{vendorId}/orders/{orderId}',static function(Request $request,array $params) use ($id): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new VendorOrderController())->show($user,$id($params,'vendorId'),$id($params,'orderId'));
});
$router->patch('/api/v1/vendor/{vendorId}/orders/{orderId}/status',static function(Request $request,array $params) use ($id): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    CsrfMiddleware::validate($request);
    (new VendorOrderController())->status($request,$user,$id($params,'vendorId'),$id($params,'orderId'));
});
$router->get('/api/v1/vendor/{vendorId}/earnings',static function(Request $request,array $params) use ($id): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new VendorFinanceController())->earnings($user,$id($params,'vendorId'));
});
$router->get('/api/v1/vendor/{vendorId}/payouts',static function(Request $request,array $params) use ($id): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new VendorFinanceController())->payouts($request,$user,$id($params,'vendorId'));
});

$router->get('/api/v1/notifications',static function(Request $request): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new NotificationController())->index($request,$user);
});
$router->patch('/api/v1/notifications/{id}/read',static function(Request $request,array $params) use ($id): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    CsrfMiddleware::validate($request);
    (new NotificationController())->read($user,$id($params,'id'));
});
$router->get('/api/v1/notification-preferences',static function(Request $request): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    (new NotificationController())->preferences($user);
});
$router->put('/api/v1/notification-preferences',static function(Request $request): void {
    $user = AuthMiddleware::handle();
    if ($user === null) { return; }
    CsrfMiddleware::validate($request);
    (new NotificationController())->updatePreference($request,$user);
});
$router->get('/api/v1/admin/notifications/queue',static function(Request $request): void {
    $admin = RoleMiddleware::handle('admin');
    if ($admin === null) { return; }
    (new NotificationController())->queueStats();
});
