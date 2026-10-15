<?php

declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'MultiSS\\';
    if (!str_starts_with($class,$prefix)) { return; }
    $path = dirname(__DIR__) . '/backend/app/' . str_replace('\\','/',substr($class,strlen($prefix))) . '.php';
    if (is_file($path)) { require_once $path; }
});

use MultiSS\Services\NotificationTemplate;
use MultiSS\Core\Router;

$assertions = 0;
function check(bool $condition,string $message): void
{
    global $assertions;
    $assertions++;
    if (!$condition) { throw new RuntimeException('FAILED: '.$message); }
}

foreach (NotificationTemplate::TYPES as $type) {
    $rendered = NotificationTemplate::render($type,[
        'company'=>'Example Ltd','status'=>'approved','order'=>'O-123','product'=>'Test',
        'quantity'=>'2','sku'=>'SKU-2',
    ]);
    check(is_string($rendered['title']) && $rendered['title'] !== '', 'Event title: '.$type);
    check(is_string($rendered['body']) && $rendered['body'] !== '', 'Event body: '.$type);
}
try {
    NotificationTemplate::render('free_form_email',['subject'=>'danger']);
    check(false,'Reject unsupported event');
} catch (InvalidArgumentException $expected) {
    check(true,'Reject unsupported event');
}

$router = new Router();
require dirname(__DIR__) . '/backend/routes/api.php';
$prop = (new ReflectionClass($router))->getProperty('routes');
$all = $prop->getValue($router);
$seen = [];
foreach ($all as $route) {
    $key = $route['method'].' '.$route['path'];
    check(!isset($seen[$key]),'Unique route: '.$key);
    $seen[$key] = true;
}
$expected = [
    'POST /api/v1/vendor/applications',
    'GET /api/v1/vendor/applications',
    'GET /api/v1/admin/vendor-applications',
    'PATCH /api/v1/admin/vendor-applications/{id}/review',
    'GET /api/v1/vendor/me',
    'GET /api/v1/vendor/{vendorId}/products',
    'GET /api/v1/vendor/{vendorId}/inventory',
    'GET /api/v1/vendor/{vendorId}/orders',
    'GET /api/v1/vendor/{vendorId}/orders/{orderId}',
    'PATCH /api/v1/vendor/{vendorId}/orders/{orderId}/status',
    'GET /api/v1/vendor/{vendorId}/earnings',
    'GET /api/v1/vendor/{vendorId}/payouts',
    'GET /api/v1/notifications',
    'PATCH /api/v1/notifications/{id}/read',
    'GET /api/v1/notification-preferences',
    'PUT /api/v1/notification-preferences',
    'GET /api/v1/admin/notifications/queue',
];
foreach ($expected as $route) { check(isset($seen[$route]),'Route exists: '.$route); }

foreach ([
    MultiSS\Controllers\VendorApplicationController::class,
    MultiSS\Controllers\VendorController::class,
    MultiSS\Controllers\VendorOrderController::class,
    MultiSS\Controllers\VendorFinanceController::class,
    MultiSS\Controllers\NotificationController::class,
] as $class) { check(class_exists($class),'Autoload: '.$class); }

echo "Phase 9 + 10 unit/route checks passed ($assertions assertions).\n";
