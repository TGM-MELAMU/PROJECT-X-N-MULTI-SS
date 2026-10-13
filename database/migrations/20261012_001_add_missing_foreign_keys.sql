ALTER TABLE products
    ADD CONSTRAINT fk_products_vendor
    FOREIGN KEY (vendor_id)
    REFERENCES vendors(vendor_id)
    ON DELETE RESTRICT;

ALTER TABLE payments
    ADD CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id)
    REFERENCES orders(order_id)
    ON DELETE RESTRICT;