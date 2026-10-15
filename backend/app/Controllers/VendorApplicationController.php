<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Services\VendorMarketplaceService;

final class VendorApplicationController extends MarketplaceController
{
    private VendorMarketplaceService $vendors;
    public function __construct(?VendorMarketplaceService $vendors = null)
    {
        $this->vendors = $vendors ?? new VendorMarketplaceService();
    }
    public function mine(array $user): void
    {
        $this->respond(fn(): array => $this->vendors->myApplications((int)$user['user_id']));
    }
    public function submit(Request $request, array $user): void
    {
        $this->respond(fn(): array => $this->vendors->apply((int)$user['user_id'],$request->body()),201);
    }
    public function adminIndex(Request $request): void
    {
        $this->respond(fn(): array => $this->vendors->adminApplications($request->query()));
    }
    public function review(Request $request, array $admin, int $id): void
    {
        $this->respond(fn(): array => $this->vendors->review((int)$admin['user_id'],$id,$request->body()));
    }
}
