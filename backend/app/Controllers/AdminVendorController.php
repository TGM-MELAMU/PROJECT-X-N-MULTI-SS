<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Services\AdminVendorService;

final class AdminVendorController extends AdminManagementController
{
    private AdminVendorService $vendors;

    public function __construct(?AdminVendorService $vendors = null)
    {
        $this->vendors = $vendors ?? new AdminVendorService();
    }

    public function index(Request $request): void
    {
        $this->respond(fn (): array => $this->vendors->listing($request->query()));
    }

    public function show(int $id): void
    {
        $this->respond(fn (): array => $this->vendors->vendor($id));
    }

    public function status(Request $request, int $id): void
    {
        $this->respond(fn (): array => $this->vendors->status($id, $request->body()), 'Vendor status updated.');
    }
}
