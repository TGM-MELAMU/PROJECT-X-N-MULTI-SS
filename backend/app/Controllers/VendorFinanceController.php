<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Services\VendorMarketplaceService;

final class VendorFinanceController extends MarketplaceController
{
    private VendorMarketplaceService $vendors;
    public function __construct(?VendorMarketplaceService $vendors = null)
    {
        $this->vendors = $vendors ?? new VendorMarketplaceService();
    }
    public function earnings(array $user,int $vendor): void
    {
        $this->respond(fn(): array => $this->vendors->earnings((int)$user['user_id'],$vendor));
    }
    public function payouts(Request $request,array $user,int $vendor): void
    {
        $this->respond(fn(): array => $this->vendors->payouts((int)$user['user_id'],$vendor,$request->query()));
    }
}
