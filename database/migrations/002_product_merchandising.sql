ALTER TABLE products
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active,
  ADD COLUMN sort_order INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_featured,
  ADD INDEX idx_products_merchandising (is_active, is_featured, sort_order);

UPDATE products
SET is_featured = TRUE
WHERE is_active = TRUE;
