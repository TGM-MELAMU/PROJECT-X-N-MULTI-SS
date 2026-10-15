<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Services\VendorMarketplaceService;

final class VendorController extends MarketplaceController
{
    private VendorMarketplaceService $vendors;
    public function __construct(?VendorMarketplaceService $vendors = null)
    {
        $this->vendors = $vendors ?? new VendorMarketplaceService();
    }
    public function mine(array $user): void
    {
        $this->respond(fn(): array => $this->vendors->memberships((int)$user['user_id']));
    }
    public function products(Request $request,array $user,int $id): void
    {
        $this->respond(fn(): array => $this->vendors->products((int)$user['user_id'],$id,$request->query()));
    }
    public function inventory(Request $request,array $user,int $id): void
    {
        $this->respond(fn(): array => $this->vendors->inventory((int)$user['user_id'],$id,$request->query()));
    }
}
