ALTER TABLE payments
  MODIFY COLUMN provider ENUM('mercado_pago','pix_manual') NOT NULL,
  ADD COLUMN pix_payload TEXT NULL AFTER provider_preference_id,
  ADD COLUMN manual_reviewed_at TIMESTAMP NULL AFTER pix_payload;
