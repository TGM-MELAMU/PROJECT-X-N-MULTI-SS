-- MultiSS Phase 6 + 7 foundation
-- Checkout, delivery, collection, fulfillment, shipment tracking,
-- and payment webhook/idempotency support.
--
-- Additive migration only. Existing orders, payments, vendor orders,
-- refunds and financial records are preserved.

-- ============================================================
-- 1. ORDERS: add the checkout financial breakdown when missing
-- ============================================================

SET @has_vat_amount = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'vat_amount'
);

SET @sql = IF(
    @has_vat_amount = 0,
    'ALTER TABLE orders
        ADD COLUMN vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00
        AFTER subtotal',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @has_shipping_amount = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'shipping_amount'
);

SET @sql = IF(
    @has_shipping_amount = 0,
    'ALTER TABLE orders
        ADD COLUMN shipping_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00
        AFTER vat_amount',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


ALTER TABLE orders
    MODIFY COLUMN order_status
    ENUM(
        'pending_payment',
        'payment_failed',
        'new',
        'confirmed',
        'processing',
        'completed',
        'cancelled'
    )
    NOT NULL DEFAULT 'pending_payment';


-- Historical orders use VAT-inclusive prices.
UPDATE orders
SET vat_amount = ROUND(total_amount * 15 / 115, 2)
WHERE vat_amount = 0.00
  AND total_amount > 0;


-- ============================================================
-- 2. CONFIGURABLE DELIVERY RATE BRACKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS delivery_rate_brackets (
    delivery_rate_id INT UNSIGNED NOT NULL AUTO_INCREMENT,

    delivery_method ENUM(
        'standard',
        'express'
    ) NOT NULL,

    min_distance_km DECIMAL(8,2) NOT NULL,
    max_distance_km DECIMAL(8,2) DEFAULT NULL,

    price DECIMAL(12,2) NOT NULL,

    status ENUM(
        'active',
        'inactive'
    ) NOT NULL DEFAULT 'active',

    created_by INT UNSIGNED DEFAULT NULL,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (delivery_rate_id),

    KEY idx_delivery_rates_lookup (
        delivery_method,
        status,
        min_distance_km,
        max_distance_km
    ),

    KEY idx_delivery_rates_created_by (
        created_by
    ),

    CONSTRAINT fk_delivery_rates_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (user_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_delivery_rate_distance
        CHECK (
            min_distance_km >= 0
            AND (
                max_distance_km IS NULL
                OR max_distance_km >= min_distance_km
            )
        ),

    CONSTRAINT chk_delivery_rate_price
        CHECK (price >= 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. CONFIGURABLE COLLECTION LOCATION
-- ============================================================

CREATE TABLE IF NOT EXISTS collection_locations (
    collection_location_id INT UNSIGNED
        NOT NULL AUTO_INCREMENT,

    location_name VARCHAR(150) NOT NULL,

    contact_number VARCHAR(30) DEFAULT NULL,

    address_line_1 VARCHAR(150) NOT NULL,
    address_line_2 VARCHAR(150) DEFAULT NULL,

    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,

    country VARCHAR(100) NOT NULL
        DEFAULT 'South Africa',

    status ENUM(
        'active',
        'inactive'
    ) NOT NULL DEFAULT 'active',

    updated_by INT UNSIGNED DEFAULT NULL,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (collection_location_id),

    KEY idx_collection_locations_status (
        status
    ),

    KEY idx_collection_locations_updated_by (
        updated_by
    ),

    CONSTRAINT fk_collection_locations_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (user_id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. HISTORICAL ORDER FULFILLMENT SNAPSHOT
-- ============================================================

CREATE TABLE IF NOT EXISTS order_fulfillments (
    order_fulfillment_id INT UNSIGNED
        NOT NULL AUTO_INCREMENT,

    order_id INT UNSIGNED NOT NULL,

    fulfillment_method ENUM(
        'delivery',
        'collection'
    ) NOT NULL,

    delivery_method ENUM(
        'standard',
        'express'
    ) DEFAULT NULL,

    delivery_fee DECIMAL(12,2)
        NOT NULL DEFAULT 0.00,

    calculated_distance_km DECIMAL(8,2)
        DEFAULT NULL,

    collection_location_id INT UNSIGNED
        DEFAULT NULL,

    collection_name VARCHAR(150)
        DEFAULT NULL,

    collection_contact_number VARCHAR(30)
        DEFAULT NULL,

    collection_address_line_1 VARCHAR(150)
        DEFAULT NULL,

    collection_address_line_2 VARCHAR(150)
        DEFAULT NULL,

    collection_city VARCHAR(100)
        DEFAULT NULL,

    collection_province VARCHAR(100)
        DEFAULT NULL,

    collection_postal_code VARCHAR(20)
        DEFAULT NULL,

    collection_country VARCHAR(100)
        DEFAULT NULL,

    fulfillment_status ENUM(
        'payment_pending',
        'payment_successful',
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'ready_for_collection',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'payment_pending',

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (order_fulfillment_id),

    UNIQUE KEY uq_order_fulfillment_order (
        order_id
    ),

    KEY idx_order_fulfillment_status (
        fulfillment_status
    ),

    KEY idx_order_fulfillment_collection (
        collection_location_id
    ),

    CONSTRAINT fk_order_fulfillment_order
        FOREIGN KEY (order_id)
        REFERENCES orders (order_id),

    CONSTRAINT fk_order_fulfillment_collection
        FOREIGN KEY (collection_location_id)
        REFERENCES collection_locations (
            collection_location_id
        )
        ON DELETE SET NULL,

    CONSTRAINT chk_order_fulfillment_fee
        CHECK (delivery_fee >= 0),

    CONSTRAINT chk_order_fulfillment_distance
        CHECK (
            calculated_distance_km IS NULL
            OR calculated_distance_km >= 0
        )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. SHIPMENT / TRACKING FOUNDATION
-- ============================================================

CREATE TABLE IF NOT EXISTS shipments (
    shipment_id INT UNSIGNED
        NOT NULL AUTO_INCREMENT,

    order_id INT UNSIGNED NOT NULL,

    vendor_order_id INT UNSIGNED
        DEFAULT NULL,

    courier_provider VARCHAR(100)
        DEFAULT NULL,

    provider_shipment_reference VARCHAR(150)
        DEFAULT NULL,

    tracking_reference VARCHAR(150)
        DEFAULT NULL,

    shipment_status ENUM(
        'pending',
        'created',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'failed',
        'cancelled'
    ) NOT NULL DEFAULT 'pending',

    shipped_at TIMESTAMP NULL
        DEFAULT NULL,

    delivered_at TIMESTAMP NULL
        DEFAULT NULL,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (shipment_id),

    KEY idx_shipments_order (
        order_id
    ),

    KEY idx_shipments_vendor_order (
        vendor_order_id,
        order_id
    ),

    KEY idx_shipments_status (
        shipment_status
    ),

    KEY idx_shipments_tracking (
        tracking_reference
    ),

    CONSTRAINT fk_shipments_order
        FOREIGN KEY (order_id)
        REFERENCES orders (order_id),

    CONSTRAINT fk_shipments_vendor_order
        FOREIGN KEY (
            vendor_order_id,
            order_id
        )
        REFERENCES vendor_orders (
            vendor_order_id,
            order_id
        )

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. PAYMENT WEBHOOK / IDEMPOTENCY FOUNDATION
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_webhook_events (
    payment_webhook_event_id INT UNSIGNED
        NOT NULL AUTO_INCREMENT,

    payment_id INT UNSIGNED
        DEFAULT NULL,

    payment_gateway VARCHAR(50)
        NOT NULL,

    event_key VARCHAR(150)
        NOT NULL,

    payload_hash CHAR(64)
        NOT NULL,

    processing_status ENUM(
        'received',
        'processed',
        'ignored',
        'failed'
    ) NOT NULL DEFAULT 'received',

    error_message VARCHAR(500)
        DEFAULT NULL,

    received_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    processed_at TIMESTAMP NULL
        DEFAULT NULL,

    PRIMARY KEY (
        payment_webhook_event_id
    ),

    UNIQUE KEY uq_payment_webhook_event (
        payment_gateway,
        event_key
    ),

    KEY idx_payment_webhook_payment (
        payment_id
    ),

    KEY idx_payment_webhook_status (
        processing_status
    ),

    CONSTRAINT fk_payment_webhook_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments (payment_id)
        ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- Ensure a gateway transaction reference cannot be processed
-- more than once.

SET @has_payment_transaction_unique = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND INDEX_NAME =
          'uq_payments_gateway_transaction'
);

SET @sql = IF(
    @has_payment_transaction_unique = 0,
    'ALTER TABLE payments
        ADD UNIQUE KEY
        uq_payments_gateway_transaction
        (
            payment_gateway,
            transaction_reference
        )',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
