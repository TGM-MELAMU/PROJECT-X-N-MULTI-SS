<?php

declare(strict_types=1);

namespace MultiSS\Services;

use InvalidArgumentException;

/** Only trusted, predefined event types may produce an outgoing message. */
final class NotificationTemplate
{
    public const TYPES = [
        'vendor_application_submitted',
        'vendor_application_reviewed',
        'vendor_order_status_changed',
        'inventory_low_stock',
        'product_approval',
        'order_status_changed',
        'vendor_status_changed',
    ];

    public static function render(string $event, array $data): array
    {
        if (!in_array($event, self::TYPES, true)) {
            throw new InvalidArgumentException('Unsupported notification event.');
        }

        $value = static function (string $key, int $length = 120) use ($data): string {
            $input = $data[$key] ?? '';
            if (!is_scalar($input)) {
                return '';
            }
            return substr(trim((string) $input), 0, $length);
        };

        return match ($event) {
            'vendor_application_submitted' => [
                'title' => 'New vendor application',
                'body' => 'A vendor application was submitted by ' . $value('company') . '.',
                'link_path' => null,
            ],
            'vendor_application_reviewed' => [
                'title' => 'Your MultiSS vendor application',
                'body' => 'Your application for ' . $value('company') . ' is now ' . $value('status') . '.',
                'link_path' => null,
            ],
            'vendor_order_status_changed' => [
                'title' => 'Order update',
                'body' => 'Vendor order ' . $value('order') . ' is now ' . $value('status') . '.',
                'link_path' => null,
            ],
            'inventory_low_stock' => [
                'title' => 'Low stock alert',
                'body' => $value('product') . ' (' . $value('sku') . ') has ' . $value('quantity') . ' units remaining.',
                'link_path' => null,
            ],
            'product_approval' => [
                'title' => 'Product approval update',
                'body' => $value('product') . ' is now ' . $value('status') . '.',
                'link_path' => null,
            ],
            'vendor_status_changed' => [
                'title' => 'Vendor account status',
                'body' => 'Your vendor account ' . $value('company') . ' is now ' . $value('status') . '.',
                'link_path' => null,
            ],
            'order_status_changed' => [
                'title' => 'MultiSS order update',
                'body' => 'Order ' . $value('order') . ' is now ' . $value('status') . '.',
                'link_path' => null,
            ],
        };
    }
}
