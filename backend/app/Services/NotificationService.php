<?php

declare(strict_types=1);

namespace MultiSS\Services;

use InvalidArgumentException;
use MultiSS\Core\Logger;
use MultiSS\Repositories\NotificationRepository;
use OutOfBoundsException;

final class NotificationService
{
    private NotificationRepository $repo;

    public function __construct(?NotificationRepository $repo = null)
    {
        $this->repo = $repo ?? new NotificationRepository();
    }

    /** Best-effort after the business transaction commits; never roll back a sale. */
    public function notify(int $recipient, string $key, string $event, array $data): void
    {
        if ($recipient < 1 || $key === '' || strlen($key) > 190) {
            throw new InvalidArgumentException('Invalid notification target or key.');
        }
        $message = NotificationTemplate::render($event, $data);
        try {
            $this->repo->enqueue($recipient,$key,$event,$message);
        } catch (\Throwable $error) {
            Logger::error('Unable to enqueue notification', [
                'event' => $event, 'type' => $error::class,
            ]);
        }
    }

    public function notifyAdmins(string $key, string $event, array $data): void
    {
        try {
            $adminIds = $this->repo->adminUsers();
            foreach ($adminIds as $id) {
                $this->notify($id,$key,$event,$data);
            }
        } catch (\Throwable $error) {
            Logger::error('Unable to look up administrator alerts', ['type' => $error::class]);
        }
    }

    public function lowStockAfterAdjustment(array $change): void
    {
        if ((int) $change['new_quantity'] > (int) $change['reorder_level'] ||
            (int) $change['previous_quantity'] <= (int) $change['reorder_level']) {
            return; // Notify once when crossing the threshold downwards.
        }
        try {
            $variantId = (int) $change['variant_id'];
            $target = $this->repo->lowStockRecipients($variantId);
            foreach ($target['recipients'] ?? [] as $user) {
                $this->notify((int) $user,
                    'inventory:'. $variantId . ':movement:' . $change['movement_id'],
                    'inventory_low_stock', [
                        'sku' => $target['sku'],
                        'product' => $target['product_name'],
                        'quantity' => $change['new_quantity'],
                    ]
                );
            }
        } catch (\Throwable $error) {
            Logger::error('Unable to send low-stock alerts', ['type' => $error::class]);
        }
    }

    public function listing(int $userId, array $query): array
    {
        $page = self::positive($query['page'] ?? 1, 'page');
        $limit = self::positive($query['limit'] ?? 25, 'limit');
        if ($page > 100000 || $limit > 100) {
            throw new InvalidArgumentException('Pagination out of range.');
        }
        return $this->repo->listForUser($userId,$limit,($page-1)*$limit)
            + ['page'=>$page,'limit'=>$limit];
    }

    public function markRead(int $userId, int $id): array
    {
        if (!$this->repo->markRead($userId,self::positive($id,'notification_id'))) {
            throw new OutOfBoundsException('Notification not found.');
        }
        return ['notification_id'=>$id,'is_read'=>true];
    }

    public function preferences(int $userId): array
    {
        $existing = [];
        foreach ($this->repo->preferences($userId) as $item) {
            $existing[$item['event_type']] = (bool) $item['email_enabled'];
        }
        $result = [];
        foreach (NotificationTemplate::TYPES as $event) {
            $result[] = ['event_type'=>$event,'email_enabled'=>$existing[$event] ?? true];
        }
        return ['preferences'=>$result];
    }

    public function updatePreference(int $userId, array $data): array
    {
        $event = $data['event_type'] ?? null;
        $enabled = $data['email_enabled'] ?? null;
        if (!is_string($event) || !in_array($event,NotificationTemplate::TYPES,true)) {
            throw new InvalidArgumentException('Invalid event_type.');
        }
        if (!is_bool($enabled)) {
            throw new InvalidArgumentException('email_enabled must be a boolean.');
        }
        $this->repo->setPreference($userId,$event,$enabled);
        return ['event_type'=>$event,'email_enabled'=>$enabled];
    }

    public function queueStats(): array
    {
        return ['queue'=>$this->repo->queueStats()];
    }

    private static function positive(mixed $input, string $key): int
    {
        $n = filter_var($input, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
        if ($n === false) {
            throw new InvalidArgumentException($key . ' must be a positive integer.');
        }
        return (int) $n;
    }
}
