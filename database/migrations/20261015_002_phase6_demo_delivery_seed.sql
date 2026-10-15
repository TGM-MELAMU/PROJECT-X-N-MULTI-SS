-- MultiSS Phase 6 demo delivery configuration.
--
-- These values exist only so checkout can be demonstrated and tested
-- before the Phase 8 admin delivery configuration interface exists.
-- Replace/configure these values before production use.

INSERT INTO delivery_rate_brackets (
    delivery_method,
    min_distance_km,
    max_distance_km,
    price,
    status
)
SELECT
    'standard',
    0.00,
    10.00,
    100.00,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM delivery_rate_brackets
    WHERE delivery_method = 'standard'
      AND min_distance_km = 0.00
      AND max_distance_km = 10.00
);

INSERT INTO delivery_rate_brackets (
    delivery_method,
    min_distance_km,
    max_distance_km,
    price,
    status
)
SELECT
    'standard',
    10.01,
    30.00,
    180.00,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM delivery_rate_brackets
    WHERE delivery_method = 'standard'
      AND min_distance_km = 10.01
      AND max_distance_km = 30.00
);

INSERT INTO delivery_rate_brackets (
    delivery_method,
    min_distance_km,
    max_distance_km,
    price,
    status
)
SELECT
    'standard',
    30.01,
    NULL,
    300.00,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM delivery_rate_brackets
    WHERE delivery_method = 'standard'
      AND min_distance_km = 30.01
      AND max_distance_km IS NULL
);

INSERT INTO delivery_rate_brackets (
    delivery_method,
    min_distance_km,
    max_distance_km,
    price,
    status
)
SELECT
    'express',
    0.00,
    10.00,
    150.00,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM delivery_rate_brackets
    WHERE delivery_method = 'express'
      AND min_distance_km = 0.00
      AND max_distance_km = 10.00
);

INSERT INTO delivery_rate_brackets (
    delivery_method,
    min_distance_km,
    max_distance_km,
    price,
    status
)
SELECT
    'express',
    10.01,
    30.00,
    250.00,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM delivery_rate_brackets
    WHERE delivery_method = 'express'
      AND min_distance_km = 10.01
      AND max_distance_km = 30.00
);

INSERT INTO delivery_rate_brackets (
    delivery_method,
    min_distance_km,
    max_distance_km,
    price,
    status
)
SELECT
    'express',
    30.01,
    NULL,
    400.00,
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM delivery_rate_brackets
    WHERE delivery_method = 'express'
      AND min_distance_km = 30.01
      AND max_distance_km IS NULL
);

INSERT INTO collection_locations (
    location_name,
    contact_number,
    address_line_1,
    address_line_2,
    city,
    province,
    postal_code,
    country,
    status
)
SELECT
    'MultiSS Demo Collection Point',
    NULL,
    'DEMO ADDRESS - CONFIGURE BEFORE PRODUCTION',
    NULL,
    'Demo City',
    'Demo Province',
    '0000',
    'South Africa',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM collection_locations
    WHERE status = 'active'
);