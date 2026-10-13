-- 001_phase0_additions.sql
-- Applies on top of database/multiss_ecommerce_dev.sql (MySQL 8).
-- Run with: npm run db:migrate   (tracks applied files in schema_migrations)

-- 1. Password reset / email verification tokens (only the SHA-256 hash is stored)
CREATE TABLE user_tokens (
  token_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_type  ENUM('password_reset','email_verification') NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP NULL DEFAULT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_id),
  UNIQUE KEY uq_token_hash (token_hash),
  KEY idx_user_tokens_user (user_id, token_type),
  CONSTRAINT user_tokens_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Orders: VAT + shipping breakdown, and checkout states needed for PayFast
--    (order exists as pending_payment before redirect, confirmed once payment is verified)
ALTER TABLE orders
  ADD COLUMN vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER subtotal,
  ADD COLUMN shipping_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER vat_amount,
  MODIFY COLUMN order_status
    ENUM('pending_payment','payment_failed','new','confirmed','processing','completed','cancelled')
    NOT NULL DEFAULT 'pending_payment';

-- Backfill the existing test order (prices are VAT-inclusive: VAT = total * 15 / 115)
UPDATE orders SET vat_amount = ROUND(total_amount * 15 / 115, 2);

-- 3. Sale badges and featured products (storefront wireframe: NEW / SALE / Featured)
ALTER TABLE product_variants
  ADD COLUMN compare_at_price DECIMAL(12,2) NULL DEFAULT NULL AFTER selling_price;

ALTER TABLE products
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER product_status,
  MODIFY COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD KEY idx_products_featured (is_featured, product_status);

-- 4. Newsletter signup (footer form)
CREATE TABLE newsletter_subscribers (
  subscriber_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  subscribed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (subscriber_id),
  UNIQUE KEY uq_newsletter_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Missing foreign keys found in the dump
ALTER TABLE products
  ADD CONSTRAINT products_ibfk_vendor FOREIGN KEY (vendor_id) REFERENCES vendors (vendor_id) ON DELETE RESTRICT;

ALTER TABLE payments
  ADD CONSTRAINT payments_ibfk_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE RESTRICT;

-- 6. Roles: customers and vendors had no role rows (only 'admin' existed)
INSERT IGNORE INTO roles (role_name, description) VALUES
  ('customer', 'Registered MultiSS customer'),
  ('vendor',   'Approved third-party vendor user');
