ALTER TABLE users
    ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL
    AFTER status;


CREATE TABLE customer_profiles (
    customer_profile_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    institution_company_name VARCHAR(150) NOT NULL,
    vat_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (customer_profile_id),
    UNIQUE KEY uq_customer_profiles_user (user_id),

    CONSTRAINT fk_customer_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


CREATE TABLE user_tokens (
    token_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,

    token_type ENUM(
        'email_verification',
        'password_reset'
    ) NOT NULL,

    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (token_id),
    UNIQUE KEY uq_user_tokens_hash (token_hash),
    KEY idx_user_tokens_user_type (user_id, token_type),
    KEY idx_user_tokens_expiry (expires_at),

    CONSTRAINT fk_user_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


INSERT INTO roles (
    role_name,
    description
)
SELECT
    'customer',
    'MultiSS customer'
WHERE NOT EXISTS (
    SELECT 1
    FROM roles
    WHERE role_name = 'customer'
);