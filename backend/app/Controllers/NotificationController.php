<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Services\NotificationService;

final class NotificationController extends MarketplaceController
{
    private NotificationService $notifications;

    public function __construct(?NotificationService $notifications = null)
    {
        $this->notifications = $notifications ?? new NotificationService();
    }

    public function index(Request $request, array $user): void
    {
        $this->respond(fn(): array => $this->notifications->listing((int)$user['user_id'],$request->query()));
    }

    public function read(array $user, int $notificationId): void
    {
        $this->respond(fn(): array => $this->notifications->markRead((int)$user['user_id'],$notificationId));
    }

    public function preferences(array $user): void
    {
        $this->respond(fn(): array => $this->notifications->preferences((int)$user['user_id']));
    }

    public function updatePreference(Request $request, array $user): void
    {
        $this->respond(fn(): array => $this->notifications->updatePreference((int)$user['user_id'],$request->body()));
    }

    public function queueStats(): void
    {
        $this->respond(fn(): array => $this->notifications->queueStats());
    }
}
