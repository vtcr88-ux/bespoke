ALTER TABLE orders
  MODIFY COLUMN shipping_in_cents INT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN checkout_access_token_hash CHAR(64) NULL AFTER public_reference,
  ADD COLUMN shipping_mode ENUM('legacy_calculated','whatsapp_after_payment','manual') NULL AFTER sales_channel,
  ADD COLUMN shipping_status ENUM('awaiting_payment','awaiting_contact','contact_started','awaiting_customer_response','arranged','ready_for_pickup','dispatched','delivered','cancelled') NULL AFTER shipping_mode,
  ADD COLUMN contact_status ENUM('not_started','whatsapp_opened','contact_started','completed') NULL AFTER shipping_status,
  ADD COLUMN shipping_notes VARCHAR(1000) NULL AFTER contact_status,
  ADD COLUMN shipping_contacted_at TIMESTAMP NULL AFTER shipping_notes,
  ADD COLUMN shipping_arranged_at TIMESTAMP NULL AFTER shipping_contacted_at,
  ADD COLUMN delivery_method ENUM('undecided','delivery','pickup') NULL AFTER shipping_arranged_at,
  ADD COLUMN delivery_address VARCHAR(500) NULL AFTER delivery_method,
  ADD COLUMN pickup_instructions VARCHAR(500) NULL AFTER delivery_address,
  ADD COLUMN whatsapp_opened_at TIMESTAMP NULL AFTER pickup_instructions,
  ADD UNIQUE KEY uq_orders_checkout_access_token (checkout_access_token_hash),
  ADD INDEX idx_orders_shipping_status (shipping_status, updated_at);

UPDATE orders
SET
  shipping_mode = 'legacy_calculated',
  shipping_status = CASE
    WHEN status = 'pending_payment' THEN 'awaiting_payment'
    WHEN status IN ('paid', 'preparing') THEN 'awaiting_contact'
    WHEN status = 'shipped' THEN 'dispatched'
    WHEN status = 'delivered' THEN 'delivered'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'awaiting_payment'
  END,
  contact_status = 'not_started',
  delivery_method = 'undecided'
WHERE shipping_mode IS NULL;

ALTER TABLE whatsapp_purchase_requests
  MODIFY COLUMN shipping_in_cents INT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE payments
  ADD COLUMN provider_preference_id VARCHAR(120) NULL AFTER provider_payment_id,
  ADD INDEX idx_payments_preference (provider, provider_preference_id);

ALTER TABLE webhook_events
  ADD COLUMN processed_at TIMESTAMP NULL AFTER received_at,
  ADD COLUMN error_code VARCHAR(80) NULL AFTER processed_at;

CREATE TABLE IF NOT EXISTS order_contact_events (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  event_type ENUM('whatsapp_open_attempted','contact_started','shipping_arranged') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_contact_events_order FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_order_contact_events_order (order_id, created_at)
);
