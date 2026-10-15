<?php

declare(strict_types=1);

namespace MultiSS\Repositories;

use DomainException;
use LogicException;
use MultiSS\Core\Database;
use OutOfBoundsException;
use PDO;

final class VendorMarketplaceRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Database::connection();
    }

    public function applicationsForUser(int $user): array
    {
        $s = $this->pdo->prepare(
            'SELECT application_id,institution_company_name,vat_number,application_status,
             submitted_at,updated_at,reviewed_at,review_notes
             FROM vendor_applications WHERE user_id=? ORDER BY application_id DESC'
        );
        $s->execute([$user]);
        return $s->fetchAll();
    }

    public function applicationsForAdmin(int $limit, int $offset, ?string $status): array
    {
        $where = $status === null ? '' : ' WHERE application_status=:status';
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM vendor_applications'.$where);
        if ($status !== null) { $count->bindValue(':status',$status); }
        $count->execute();
        $s = $this->pdo->prepare(
            'SELECT application_id,user_id,institution_company_name,vat_number,email_address,
             application_status,submitted_at,updated_at,reviewed_at,reviewed_by,review_notes
             FROM vendor_applications'.$where.' ORDER BY application_id DESC LIMIT :lim OFFSET :off'
        );
        if ($status !== null) { $s->bindValue(':status',$status); }
        $s->bindValue(':lim',$limit,PDO::PARAM_INT);
        $s->bindValue(':off',$offset,PDO::PARAM_INT);
        $s->execute();
        return ['applications'=>$s->fetchAll(),'total'=>(int)$count->fetchColumn()];
    }

    public function submit(int $user, array $data): array
    {
        $this->pdo->beginTransaction();
        try {
            $account = $this->pdo->prepare('SELECT user_id,email_verified_at FROM users WHERE user_id=? AND status=\'active\' FOR UPDATE');
            $account->execute([$user]);
            $accountRow = $account->fetch();
            if (!$accountRow) {
                throw new DomainException('An active account is required.');
            }
            if ($accountRow['email_verified_at'] === null) {
                throw new DomainException('Verify your email address before applying.');
            }
            $s = $this->pdo->prepare(
                "SELECT application_id FROM vendor_applications
                 WHERE user_id=? AND application_status IN ('pending','under_review','approved') LIMIT 1"
            );
            $s->execute([$user]);
            if ($s->fetchColumn()) {
                throw new LogicException('You already have a pending or approved application.');
            }
            $blocked = $this->pdo->prepare(
                'SELECT 1 FROM vendor_blocks WHERE vat_number=? AND is_active=1
                 AND (expires_at IS NULL OR expires_at>NOW()) LIMIT 1'
            );
            $blocked->execute([$data['vat_number']]);
            if ($blocked->fetchColumn()) {
                throw new DomainException('This vendor is not eligible to apply.');
            }
            $exists = $this->pdo->prepare('SELECT 1 FROM vendors WHERE vat_number=? LIMIT 1');
            $exists->execute([$data['vat_number']]);
            if ($exists->fetchColumn()) {
                throw new LogicException('A vendor with this VAT number already exists.');
            }
            $columns = [
                'user_id','institution_company_name','vat_number','email_address','primary_contact_number',
                'secondary_contact_number','billing_address_line_1','billing_address_line_2',
                'billing_city','billing_province','billing_postal_code','billing_country'
            ];
            $placeholders = implode(',',array_fill(0,count($columns),'?'));
            $sql = 'INSERT INTO vendor_applications ('.implode(',',$columns).') VALUES ('.$placeholders.')';
            $this->pdo->prepare($sql)->execute(array_merge([$user],array_map(
                static fn(string $name) => $data[$name],array_slice($columns,1)
            )));
            $id = (int)$this->pdo->lastInsertId();
            $this->pdo->commit();
            return ['application_id'=>$id,'application_status'=>'pending','user_id'=>$user];
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {$this->pdo->rollBack();}
            throw $error;
        }
    }

    public function review(int $admin, int $id, string $status, ?string $notes): array
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM vendor_applications WHERE application_id=? FOR UPDATE');
            $stmt->execute([$id]);
            $app = $stmt->fetch();
            if (!$app) { throw new OutOfBoundsException('Vendor application not found.'); }
            if (!in_array($app['application_status'],['pending','under_review'],true)) {
                throw new LogicException('Only pending or under-review applications can be reviewed.');
            }
            if ($status === 'approved') {
                $blocked = $this->pdo->prepare(
                    'SELECT 1 FROM vendor_blocks WHERE vat_number=? AND is_active=1
                     AND (expires_at IS NULL OR expires_at>NOW()) LIMIT 1'
                );
                $blocked->execute([$app['vat_number']]);
                if ($blocked->fetchColumn()) {
                    throw new DomainException('Blocked vendors cannot be approved.');
                }
                $existing = $this->pdo->prepare('SELECT 1 FROM vendors WHERE vat_number=? LIMIT 1');
                $existing->execute([$app['vat_number']]);
                if ($existing->fetchColumn()) {
                    throw new LogicException('VAT number already registered to a vendor.');
                }
                $this->pdo->prepare(
                    'INSERT INTO vendors
                     (application_id,vendor_type,institution_company_name,vat_number,email_address,
                      primary_contact_number,secondary_contact_number,billing_address_line_1,
                      billing_address_line_2,billing_city,billing_province,billing_postal_code,billing_country,vendor_status)
                     VALUES (?,\'third_party\',?,?,?,?,?,?,?,?,?,?,?,\'active\')'
                )->execute([
                    $id,$app['institution_company_name'],$app['vat_number'],$app['email_address'],
                    $app['primary_contact_number'],$app['secondary_contact_number'],
                    $app['billing_address_line_1'],$app['billing_address_line_2'],
                    $app['billing_city'],$app['billing_province'],$app['billing_postal_code'],
                    $app['billing_country'],
                ]);
                $vendorId = (int)$this->pdo->lastInsertId();
                $this->pdo->prepare(
                    "INSERT INTO vendor_users (vendor_id,user_id,vendor_role,status)
                     VALUES (?,?,'owner','active')"
                )->execute([$vendorId,(int)$app['user_id']]);
                $this->pdo->prepare(
                    "INSERT IGNORE INTO user_roles (user_id,role_id)
                     SELECT ?,role_id FROM roles WHERE role_name='vendor'"
                )->execute([(int)$app['user_id']]);
                $role = $this->pdo->prepare(
                    "SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
                     WHERE ur.user_id=? AND r.role_name='vendor' LIMIT 1"
                );
                $role->execute([(int)$app['user_id']]);
                if (!$role->fetchColumn()) {
                    throw new LogicException('Vendor role is not configured.');
                }
            }
            $this->pdo->prepare(
                'UPDATE vendor_applications SET application_status=?,reviewed_by=?,review_notes=?,
                 reviewed_at=IF(?=\'under_review\',NULL,NOW()) WHERE application_id=?'
            )->execute([$status,$admin,$notes,$status,$id]);
            $this->pdo->commit();
            return ['application_id'=>$id,'user_id'=>(int)$app['user_id'],
                'company'=>$app['institution_company_name'],'status'=>$status];
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {$this->pdo->rollBack();}
            throw $error;
        }
    }

    public function memberships(int $user): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT v.vendor_id,v.institution_company_name,v.vendor_status,vu.vendor_role,vu.status AS membership_status
             FROM vendor_users vu JOIN vendors v ON v.vendor_id=vu.vendor_id
             WHERE vu.user_id=? ORDER BY v.vendor_id DESC'
        );
        $stmt->execute([$user]);
        return $stmt->fetchAll();
    }

    /** All vendor operations are scoped to an ACTIVE membership and ACTIVE vendor. */
    public function assertMember(int $user, int $vendor, bool $manager = false): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT vu.vendor_role,v.vendor_id,v.institution_company_name
             FROM vendor_users vu JOIN vendors v ON v.vendor_id=vu.vendor_id
             JOIN users u ON u.user_id=vu.user_id
             WHERE vu.user_id=? AND vu.vendor_id=? AND vu.status='active'
               AND v.vendor_status='active' AND u.status='active' LIMIT 1"
        );
        $stmt->execute([$user,$vendor]);
        $member = $stmt->fetch();
        if (!$member || ($manager && !in_array($member['vendor_role'],['owner','manager'],true))) {
            throw new DomainException('Active vendor manager membership required.');
        }
        return $member;
    }

    public function products(int $vendor, int $limit, int $offset): array
    {
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM products WHERE vendor_id=?');
        $count->execute([$vendor]);
        $stmt = $this->pdo->prepare(
            'SELECT product_id,product_name,slug,product_status,approval_status,rejection_reason,updated_at
             FROM products WHERE vendor_id=:vendor ORDER BY product_id DESC LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':vendor',$vendor,PDO::PARAM_INT);
        $stmt->bindValue(':lim',$limit,PDO::PARAM_INT);
        $stmt->bindValue(':off',$offset,PDO::PARAM_INT);
        $stmt->execute();
        return ['products'=>$stmt->fetchAll(),'total'=>(int)$count->fetchColumn()];
    }

    public function inventory(int $vendor, int $limit, int $offset): array
    {
        $from = ' FROM products p JOIN product_variants pv ON pv.product_id=p.product_id
                  LEFT JOIN inventory i ON i.variant_id=pv.variant_id WHERE p.vendor_id=?';
        $count = $this->pdo->prepare('SELECT COUNT(*)'.$from);
        $count->execute([$vendor]);
        $stmt = $this->pdo->prepare(
            'SELECT pv.variant_id,pv.sku,p.product_name,pv.variant_name,
             COALESCE(i.quantity_in_stock,0) AS quantity_in_stock,
             COALESCE(i.reorder_level,0) AS reorder_level' . $from .
            ' ORDER BY pv.variant_id DESC LIMIT ? OFFSET ?'
        );
        $stmt->bindValue(1,$vendor,PDO::PARAM_INT);
        $stmt->bindValue(2,$limit,PDO::PARAM_INT);
        $stmt->bindValue(3,$offset,PDO::PARAM_INT);
        $stmt->execute();
        return ['inventory'=>$stmt->fetchAll(),'total'=>(int)$count->fetchColumn()];
    }

    public function orders(int $vendor, int $limit, int $offset): array
    {
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM vendor_orders WHERE vendor_id=?');
        $count->execute([$vendor]);
        $stmt = $this->pdo->prepare(
            'SELECT vo.vendor_order_id,vo.vendor_order_number,vo.order_id,
             o.order_number,vo.vendor_order_status,vo.items_subtotal,
             vo.commission_total,vo.vendor_net_total,vo.created_at,vo.updated_at
             FROM vendor_orders vo JOIN orders o ON o.order_id=vo.order_id
             WHERE vo.vendor_id=:vendor ORDER BY vo.vendor_order_id DESC LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':vendor',$vendor,PDO::PARAM_INT);
        $stmt->bindValue(':lim',$limit,PDO::PARAM_INT);
        $stmt->bindValue(':off',$offset,PDO::PARAM_INT);
        $stmt->execute();
        return ['orders'=>$stmt->fetchAll(),'total'=>(int)$count->fetchColumn()];
    }

    public function order(int $vendor, int $order): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT vo.vendor_order_id,vo.vendor_order_number,vo.order_id,vo.vendor_order_status,
             vo.items_subtotal,vo.commission_total,vo.vendor_net_total,o.order_number,o.order_status,
             o.user_id AS customer_user_id
             FROM vendor_orders vo JOIN orders o ON o.order_id=vo.order_id
             WHERE vo.vendor_id=? AND vo.vendor_order_id=? LIMIT 1'
        );
        $stmt->execute([$vendor,$order]);
        $row = $stmt->fetch();
        if (!$row) { throw new OutOfBoundsException('Vendor order not found.'); }
        // Customer contact/address is intentionally not returned by this summary endpoint.
        unset($row['customer_user_id']);
        $items = $this->pdo->prepare(
            'SELECT order_item_id,product_name,variant_name,sku,quantity,unit_price,
             line_total,commission_amount,vendor_net_amount
             FROM order_items WHERE vendor_order_id=? AND order_id=? ORDER BY order_item_id'
        );
        $items->execute([$order,$row['order_id']]);
        return ['order'=>$row,'items'=>$items->fetchAll()];
    }

    public function advanceOrder(int $vendor, int $order, string $status): array
    {
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare(
                'SELECT vo.vendor_order_status,vo.vendor_order_number,vo.order_id,o.user_id,
                 o.order_status FROM vendor_orders vo JOIN orders o ON o.order_id=vo.order_id
                 WHERE vo.vendor_id=? AND vo.vendor_order_id=? FOR UPDATE'
            );
            $stmt->execute([$vendor,$order]);
            $row = $stmt->fetch();
            if (!$row) { throw new OutOfBoundsException('Vendor order not found.'); }
            $allowed = ['new'=>'confirmed','confirmed'=>'processing'];
            if (($allowed[$row['vendor_order_status']] ?? null) !== $status) {
                throw new LogicException('Only new to confirmed or confirmed to processing is allowed.');
            }
            if (!in_array($row['order_status'],['new','confirmed','processing'],true)) {
                throw new LogicException('The parent order is not ready for vendor processing.');
            }
            $this->pdo->prepare(
                'UPDATE vendor_orders SET vendor_order_status=? WHERE vendor_order_id=? AND vendor_id=?'
            )->execute([$status,$order,$vendor]);
            $this->pdo->commit();
            return ['vendor_order_id'=>$order,'vendor_order_number'=>$row['vendor_order_number'],
                'customer_user_id'=>(int)$row['user_id'],'status'=>$status];
        } catch (\Throwable $error) {
            if ($this->pdo->inTransaction()) {$this->pdo->rollBack();}
            throw $error;
        }
    }

    public function earnings(int $vendor): array
    {
        $statement = $this->pdo->prepare(
            "SELECT COUNT(*) AS vendor_orders,
             COALESCE(SUM(items_subtotal),0) AS gross_sales,
             COALESCE(SUM(commission_total),0) AS commission_total,
             COALESCE(SUM(vendor_net_total),0) AS vendor_net_total
             FROM vendor_orders WHERE vendor_id=? AND vendor_order_status NOT IN ('cancelled','refunded')"
        );
        $statement->execute([$vendor]);
        return ['totals'=>$statement->fetch(),'note'=>'Estimated order earnings; not a payout balance.'];
    }

    public function payouts(int $vendor, int $limit, int $offset): array
    {
        $count = $this->pdo->prepare('SELECT COUNT(*) FROM payment_splits WHERE vendor_id=?');
        $count->execute([$vendor]);
        $stmt = $this->pdo->prepare(
            'SELECT payment_split_id,vendor_order_id,payment_id,gross_amount,
             commission_amount,vendor_amount,split_status,processed_at,created_at
             FROM payment_splits WHERE vendor_id=:vendor
             ORDER BY payment_split_id DESC LIMIT :lim OFFSET :off'
        );
        $stmt->bindValue(':vendor',$vendor,PDO::PARAM_INT);
        $stmt->bindValue(':lim',$limit,PDO::PARAM_INT);
        $stmt->bindValue(':off',$offset,PDO::PARAM_INT);
        $stmt->execute();
        return ['payment_splits'=>$stmt->fetchAll(), 'total'=>(int)$count->fetchColumn(),
            'note'=>'Read-only gateway split ledger. No bank payout is initiated.'];
    }
}
