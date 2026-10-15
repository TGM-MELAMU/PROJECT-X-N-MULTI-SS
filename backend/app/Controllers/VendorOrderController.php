<?php

declare(strict_types=1);

namespace MultiSS\Controllers;

use MultiSS\Core\Request;
use MultiSS\Services\VendorMarketplaceService;

final class VendorOrderController extends MarketplaceController
{
    private VendorMarketplaceService $vendors;
    public function __construct(?VendorMarketplaceService $vendors = null)
    {
        $this->vendors = $vendors ?? new VendorMarketplaceService();
    }
    public function index(Request $request,array $user,int $vendor): void
    {
        $this->respond(fn(): array => $this->vendors->orders((int)$user['user_id'],$vendor,$request->query()));
    }
    public function show(array $user,int $vendor,int $order): void
    {
        $this->respond(fn(): array => $this->vendors->order((int)$user['user_id'],$vendor,$order));
    }
    public function status(Request $request,array $user,int $vendor,int $order): void
    {
        $this->respond(fn(): array => $this->vendors->advanceOrder((int)$user['user_id'],$vendor,$order,$request->body()));
    }
}
