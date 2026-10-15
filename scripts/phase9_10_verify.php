<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/backend/bootstrap.php';

$pdo = MultiSS\Core\Database::connection();
$tables = ['vendor_applications','vendor_users','vendor_orders','payment_splits',
    'notifications','notification_preferences','mail_outbox'];
foreach ($tables as $table) {
    $query = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
    $query->execute([$table]);
    if ((int)$query->fetchColumn() !== 1) { throw new RuntimeException('Missing table: '.$table); }
    echo 'OK table '.$table.PHP_EOL;
}
$roles = $pdo->query("SELECT COUNT(*) FROM roles WHERE role_name IN ('vendor','admin','customer')")->fetchColumn();
if ((int)$roles < 3) { throw new RuntimeException('Expected vendor, admin and customer roles.'); }
$version = $pdo->query('SELECT VERSION()')->fetchColumn();
echo 'DB version: '.$version.PHP_EOL;
$stats = (new MultiSS\Services\NotificationService())->queueStats();
echo 'Queue status groups: '.count($stats['queue']).PHP_EOL;
echo "Phase 9 + 10 database checks passed.\n";
