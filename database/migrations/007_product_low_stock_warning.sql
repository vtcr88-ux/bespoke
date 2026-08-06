ALTER TABLE products
  ADD COLUMN low_stock_warning_enabled BOOLEAN NOT NULL DEFAULT FALSE
  AFTER low_stock_threshold;

UPDATE products
SET low_stock_warning_enabled = TRUE
WHERE low_stock_threshold > 0
  AND stock <= low_stock_threshold;
