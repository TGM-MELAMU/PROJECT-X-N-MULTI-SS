<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Services\AdminInventoryService;

final class AdminInventoryController extends AdminManagementController
{
    private AdminInventoryService $inventory;

    public function __construct(?AdminInventoryService $inventory = null)
    {
        $this->inventory = $inventory ?? new AdminInventoryService();
    }

    public function index(Request $request): void
    {
        $this->respond(fn (): array => $this->inventory->listing($request->query()));
    }

    public function show(int $id): void
    {
        $this->respond(fn (): array => $this->inventory->item($id));
    }

    public function movements(Request $request, int $id): void
    {
        $this->respond(fn (): array => $this->inventory->movements($id, $request->query()));
    }

    public function adjust(Request $request, array $admin, int $id): void
    {
        $this->respond(fn (): array => $this->inventory->adjust($id, $admin, $request->body()), 'Stock adjusted.');
    }
}
