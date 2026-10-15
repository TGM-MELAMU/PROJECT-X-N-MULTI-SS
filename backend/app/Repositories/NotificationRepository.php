<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use MultiSS\Core\Database;
use PDO;

final class NotificationRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    /** Transaction-safe and deduplicated per user/event. */
    public function enqueue(int $recipient, string $eventKey, string $eventType, array $rendered): void
    {
        $own = !$this->pdo->inTransaction();
        if ($own) {
            $this->pdo->beginTransaction();
        }
        try {
            $stmt = $this->pdo->prepare(
                'INSERT IGNORE INTO notifications
                 (recipient_user_id,event_key,event_type,title,body,link_path)
                 VALUES (?,?,?,?,?,?)'
            );
            $stmt->execute([
                $recipient, $eventKey, $eventType, $rendered['title'],
                $rendered['body'], $rendered['link_path'],
            ]);
            // Do not queue duplicate emails on retried events.
            if ($stmt->rowCount() === 1) {
                $id = (int) $this->pdo->lastInsertId();
                $email = $this->pdo->prepare(
                    'INSERT INTO mail_outbox (notification_id, recipient_email)
                     SELECT ?,u.email FROM users u
                     LEFT JOIN notification_preferences pref
                       ON pref.user_id = u.user_id AND pref.event_type = ?
                     WHERE u.user_id = ? AND u.status = \'active\'
                       AND COALESCE(pref.email_enabled,1) = 1'
                );
                $email->execute([$id, $eventType, $recipient]);
            }
            if ($own) {
                $this->pdo->commit();
            }
        } catch (\Throwable $error) {
            if ($own && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }

    public function listForUser(int $user, int $limit, int $offset): array
    {
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM notifications WHERE recipient_user_id = ?');
        $count->execute([$user]);
        $stmt = $this->pdo->prepare(
            'SELECT notification_id,event_type,title,body,link_path,is_read,created_at,read_at
             FROM notifications WHERE recipient_user_id = :uid
             ORDER BY notification_id DESC LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':uid', $user, PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return ['notifications' => $stmt->fetchAll(), 'total' => (int) $count->fetchColumn()];
    }

    public function markRead(int $user, int $id): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE notifications SET is_read=1,read_at=COALESCE(read_at,NOW())
             WHERE notification_id=? AND recipient_user_id=?'
        );
        $stmt->execute([$id, $user]);
        if ($stmt->rowCount() > 0) {
            return true;
        }
        $exists = $this->pdo->prepare('SELECT 1 FROM notifications WHERE notification_id=? AND recipient_user_id=?');
        $exists->execute([$id, $user]);
        return (bool) $exists->fetchColumn();
    }

    public function preferences(int $user): array
    {
        $stmt = $this->pdo->prepare('SELECT event_type,email_enabled FROM notification_preferences WHERE user_id=?');
        $stmt->execute([$user]);
        return $stmt->fetchAll();
    }

    public function setPreference(int $user, string $event, bool $enabled): void
    {
        $this->pdo->prepare(
            'INSERT INTO notification_preferences (user_id,event_type,email_enabled)
             VALUES (?,?,?) ON DUPLICATE KEY UPDATE email_enabled=VALUES(email_enabled)'
        )->execute([$user,$event,$enabled ? 1 : 0]);
    }

    public function adminUsers(): array
    {
        $stmt = $this->pdo->query(
            "SELECT DISTINCT u.user_id FROM users u
             JOIN user_roles ur ON ur.user_id=u.user_id
             JOIN roles r ON r.role_id=ur.role_id
             WHERE r.role_name='admin' AND u.status='active'"
        );
        return array_map('intval',$stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function vendorManagers(int $vendorId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT DISTINCT vu.user_id FROM vendor_users vu
             JOIN users u ON u.user_id=vu.user_id
             WHERE vu.vendor_id=? AND vu.status='active' AND u.status='active'
               AND vu.vendor_role IN ('owner','manager')"
        );
        $stmt->execute([$vendorId]);
        return array_map('intval',$stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    public function lowStockRecipients(int $variantId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT p.vendor_id,p.product_name,pv.sku FROM product_variants pv
             JOIN products p ON p.product_id=pv.product_id WHERE pv.variant_id=?'
        );
        $stmt->execute([$variantId]);
        $row = $stmt->fetch();
        if (!$row) {
            return [];
        }
        $row['recipients'] = array_values(array_unique(array_merge(
            $this->vendorManagers((int) $row['vendor_id']), $this->adminUsers()
        )));
        return $row;
    }

    public function queueStats(): array
    {
        $stmt = $this->pdo->query('SELECT status,COUNT(*) AS total FROM mail_outbox GROUP BY status');
        return $stmt->fetchAll();
    }

    /** Claims rows once; stale worker leases are recovered after 15 minutes. */
    public function claim(int $limit): array
    {
        $token = bin2hex(random_bytes(16));
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                "SELECT mail_outbox_id FROM mail_outbox
                 WHERE ((status IN ('queued','retry') AND next_attempt_at <= NOW())
                    OR (status='processing' AND locked_at < NOW() - INTERVAL 15 MINUTE))
                   AND attempts < 5
                 ORDER BY mail_outbox_id ASC LIMIT :lim FOR UPDATE SKIP LOCKED"
            );
            $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
            $stmt->execute();
            $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
            if (!$ids) {
                $this->pdo->commit();
                return [];
            }
            $slots = implode(',',array_fill(0,count($ids),'?'));
            $update = $this->pdo->prepare(
                "UPDATE mail_outbox SET status='processing',claim_token=?,locked_at=NOW(),
                 attempts=attempts+1 WHERE mail_outbox_id IN ($slots)"
            );
            $update->execute(array_merge([$token],$ids));
            $this->pdo->commit();
            $read = $this->pdo->prepare(
                'SELECT m.mail_outbox_id,m.claim_token,m.recipient_email,m.attempts,n.title,n.body
                 FROM mail_outbox m JOIN notifications n ON n.notification_id=m.notification_id
                 WHERE m.claim_token=? AND m.status=\'processing\''
            );
            $read->execute([$token]);
            return $read->fetchAll();
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }

    public function finish(int $id, string $claimToken, bool $success, int $attempt, ?string $error = null): void
    {
        $status = $success ? 'sent' : ($attempt >= 5 ? 'failed' : 'retry');
        $delay = min(3600,60 * (2 ** min($attempt,6)));
        $stmt = $this->pdo->prepare(
            'UPDATE mail_outbox SET status=?,claim_token=NULL,locked_at=NULL,
             sent_at=IF(?=1,NOW(),sent_at),last_error=?,
             next_attempt_at=DATE_ADD(NOW(),INTERVAL ? SECOND)
             WHERE mail_outbox_id=? AND claim_token=? AND status=\'processing\''
        );
        $stmt->execute([$status,$success ? 1 : 0,$error === null ? null : substr($error,0,255),$delay,$id,$claimToken]);
    }
}
