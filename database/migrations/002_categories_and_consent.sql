-- 002_categories_and_consent.sql
-- Runs after 001. Safe to re-run: every statement is idempotent.

-- 1. The eight categories the site menu uses (slugs must match src/config/site.ts).
--    "Special Offers" needs no rows: it is derived from compare-at prices.
INSERT IGNORE INTO categories (category_name, slug, description) VALUES
  ('Laboratory Equipment',  'laboratory-equipment',  'Laboratory equipment and related products'),
  ('Medical Equipment',     'medical-equipment',     'Medical equipment and devices'),
  ('Chemicals & Reagents',  'chemicals-reagents',    'Laboratory chemicals and reagents'),
  ('Consumables',           'consumables',           'Laboratory and medical consumables'),
  ('Safety & Protection',   'safety-protection',     'Personal protective equipment and safety gear'),
  ('Glassware',             'glassware',             'Laboratory glassware'),
  ('Furniture',             'furniture',             'Laboratory furniture'),
  ('Special Offers',        'special-offers',        'Reduced-price products');

-- 2. Categorise the imported catalogue from the prefix on the product name ("CONS-Membrane filter...").
--    Only prefixes whose meaning is clear are mapped. MISC-, other prefixes and unprefixed names stay
--    uncategorised until the client confirms how they should be grouped (they still appear under All products).
INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.product_id, c.category_id
FROM products p
JOIN categories c ON c.slug = CASE
    WHEN p.product_name LIKE 'LAB-%'   THEN 'laboratory-equipment'
    WHEN p.product_name LIKE 'MED-%'   THEN 'medical-equipment'
    WHEN p.product_name LIKE 'CHEM-%'  THEN 'chemicals-reagents'
    WHEN p.product_name LIKE 'REAG-%'  THEN 'chemicals-reagents'
    WHEN p.product_name LIKE 'CONS-%'  THEN 'consumables'
    WHEN p.product_name LIKE 'GLASS-%' THEN 'glassware'
  END;

-- 3. Proof of consent at registration (POPIA): when the customer accepted the terms and privacy policy.
ALTER TABLE users
  ADD COLUMN terms_accepted_at TIMESTAMP NULL DEFAULT NULL AFTER status;
