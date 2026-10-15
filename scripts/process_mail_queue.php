<?php

declare(strict_types=1);

use MultiSS\Repositories\NotificationRepository;
use MultiSS\Services\EmailService;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

require dirname(__DIR__) . '/backend/bootstrap.php';

$args = array_slice($argv,1);
if (array_diff($args, ['--dry-run']) !== []) {
    fwrite(STDERR,"Usage: php scripts/process_mail_queue.php [--dry-run]\n");
    exit(2);
}

$repo = new NotificationRepository();
if (in_array('--dry-run',$args,true)) {
    echo json_encode($repo->queueStats(),JSON_PRETTY_PRINT) . PHP_EOL;
    exit(0);
}

$mail = new EmailService();
if (!$mail->isConfigured()) {
    fwrite(STDERR,"SMTP not configured. Queue preserved; add MAIL_* to .env first.\n");
    exit(2);
}

$rows = $repo->claim(20);
$sent = 0;
$failed = 0;
foreach ($rows as $row) {
    try {
        $mail->sendMessage((string)$row['recipient_email'],(string)$row['title'],(string)$row['body']);
        $repo->finish((int)$row['mail_outbox_id'],(string)$row['claim_token'],true,(int)$row['attempts']);
        $sent++;
    } catch (\Throwable $error) {
        $repo->finish((int)$row['mail_outbox_id'],(string)$row['claim_token'],false,(int)$row['attempts'],'SMTP delivery failed');
        $failed++;
    }
}
echo "Processed " . count($rows) . " messages: $sent sent, $failed deferred/failed.\n";
exit($failed ? 1 : 0);
