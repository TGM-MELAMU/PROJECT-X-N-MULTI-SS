<?php

declare(strict_types=1);

namespace MultiSS\Services;

use InvalidArgumentException;
use MultiSS\Repositories\VendorMarketplaceRepository;

final class VendorMarketplaceService
{
    private VendorMarketplaceRepository $repo;
    private NotificationService $notifications;

    public function __construct(
        ?VendorMarketplaceRepository $repo = null,
        ?NotificationService $notifications = null
    ) {
        $this->repo = $repo ?? new VendorMarketplaceRepository();
        $this->notifications = $notifications ?? new NotificationService();
    }

    public function myApplications(int $user): array
    {
        return ['applications'=>$this->repo->applicationsForUser($user)];
    }

    public function apply(int $user, array $body): array
    {
        $requirements = [
            'institution_company_name'=>150,'vat_number'=>100,'email_address'=>255,
            'primary_contact_number'=>30,'billing_address_line_1'=>150,
            'billing_city'=>100,'billing_province'=>100,'billing_postal_code'=>20,
        ];
        $data = [];
        foreach ($requirements as $field=>$max) {
            $data[$field] = self::text($body,$field,$max,true);
        }
        foreach (['secondary_contact_number'=>30,'billing_address_line_2'=>150] as $field=>$max) {
            $data[$field] = self::text($body,$field,$max,false);
        }
        $data['billing_country'] = self::text($body,'billing_country',100,false) ?? 'South Africa';
        if (filter_var($data['email_address'],FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException('email_address is invalid.');
        }
        if (!preg_match('/^[0-9]{4}$/',$data['billing_postal_code'])) {
            throw new InvalidArgumentException('billing_postal_code must contain four digits.');
        }
        $application = $this->repo->submit($user,$data);
        $this->notifications->notifyAdmins('vendor-application:'.$application['application_id'],
            'vendor_application_submitted',['company'=>$data['institution_company_name']]);
        return $application;
    }

    public function adminApplications(array $query): array
    {
        [$limit,$offset,$page] = self::page($query);
        $status = $query['status'] ?? null;
        if ($status !== null && (!is_string($status) ||
            !in_array($status,['pending','under_review','approved','rejected','withdrawn'],true))) {
            throw new InvalidArgumentException('Invalid application status.');
        }
        return $this->repo->applicationsForAdmin($limit,$offset,$status)
            + ['page'=>$page,'limit'=>$limit];
    }

    public function review(int $admin, int $id, array $body): array
    {
        $status = $body['status'] ?? null;
        if (!is_string($status) || !in_array($status,['under_review','approved','rejected'],true)) {
            throw new InvalidArgumentException('status must be under_review, approved or rejected.');
        }
        $notes = self::text($body,'review_notes',2000,false);
        if ($status === 'rejected' && $notes === null) {
            throw new InvalidArgumentException('review_notes required for rejection.');
        }
        $result = $this->repo->review($admin,self::positive($id,'application_id'),$status,$notes);
        $this->notifications->notify($result['user_id'],'vendor-review:'.$id.':'.$status,
            'vendor_application_reviewed',['company'=>$result['company'],'status'=>$status]);
        return $result;
    }

    public function memberships(int $user): array
    {
        return ['vendors'=>$this->repo->memberships($user)];
    }

    public function products(int $user, int $vendor, array $query): array
    {
        $this->repo->assertMember($user,self::positive($vendor,'vendor_id'));
        [$limit,$offset,$page] = self::page($query);
        return $this->repo->products($vendor,$limit,$offset) + ['page'=>$page,'limit'=>$limit];
    }

    public function inventory(int $user, int $vendor, array $query): array
    {
        $this->repo->assertMember($user,self::positive($vendor,'vendor_id'));
        [$limit,$offset,$page] = self::page($query);
        return $this->repo->inventory($vendor,$limit,$offset) + ['page'=>$page,'limit'=>$limit];
    }

    public function orders(int $user, int $vendor, array $query): array
    {
        $this->repo->assertMember($user,self::positive($vendor,'vendor_id'));
        [$limit,$offset,$page] = self::page($query);
        return $this->repo->orders($vendor,$limit,$offset) + ['page'=>$page,'limit'=>$limit];
    }

    public function order(int $user, int $vendor, int $order): array
    {
        $this->repo->assertMember($user,self::positive($vendor,'vendor_id'));
        return $this->repo->order($vendor,self::positive($order,'vendor_order_id'));
    }

    public function advanceOrder(int $user, int $vendor, int $order, array $body): array
    {
        $this->repo->assertMember($user,self::positive($vendor,'vendor_id'),true);
        $status = $body['status'] ?? null;
        if (!is_string($status) || !in_array($status,['confirmed','processing'],true)) {
            throw new InvalidArgumentException('status must be confirmed or processing.');
        }
        $updated = $this->repo->advanceOrder($vendor,self::positive($order,'vendor_order_id'),$status);
        $this->notifications->notify($updated['customer_user_id'],
            'vendor-order:'.$order.':'.$status,'vendor_order_status_changed',
            ['order'=>$updated['vendor_order_number'],'status'=>$status]);
        unset($updated['customer_user_id']);
        return $updated;
    }

    public function earnings(int $user, int $vendor): array
    {
        $this->repo->assertMember($user,self::positive($vendor,'vendor_id'),true);
        return $this->repo->earnings($vendor);
    }

    public function payouts(int $user, int $vendor, array $query): array
    {
        $this->repo->assertMember($user,self::positive($vendor,'vendor_id'),true);
        [$limit,$offset,$page] = self::page($query);
        return $this->repo->payouts($vendor,$limit,$offset) + ['page'=>$page,'limit'=>$limit];
    }

    private static function text(array $body, string $key, int $max, bool $required): ?string
    {
        $raw = $body[$key] ?? null;
        if ($raw === null && !$required) { return null; }
        if (!is_string($raw)) { throw new InvalidArgumentException($key.' must be text.'); }
        $value = trim($raw);
        if ($required && $value === '') { throw new InvalidArgumentException($key.' is required.'); }
        if (strlen($value) > $max || strpbrk($value,"\r\n") !== false) {
            throw new InvalidArgumentException($key.' is too long or contains a newline.');
        }
        return $value === '' ? null : $value;
    }

    private static function positive(mixed $value, string $name): int
    {
        $id = filter_var($value,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        if ($id === false) { throw new InvalidArgumentException($name.' must be a positive integer.'); }
        return (int)$id;
    }

    private static function page(array $params): array
    {
        $page = self::positive($params['page'] ?? 1,'page');
        $limit = self::positive($params['limit'] ?? 25,'limit');
        if ($page > 100000 || $limit > 100) { throw new InvalidArgumentException('Pagination out of range.'); }
        return [$limit,($page-1)*$limit,$page];
    }
}
