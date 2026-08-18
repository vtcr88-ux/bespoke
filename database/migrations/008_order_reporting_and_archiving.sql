ALTER TABLE orders
  ADD COLUMN revenue_confirmed_at TIMESTAMP NULL AFTER whatsapp_opened_at,
  ADD COLUMN archived_at TIMESTAMP NULL AFTER revenue_confirmed_at,
  ADD INDEX idx_orders_reporting (archived_at, revenue_confirmed_at, created_at);

UPDATE orders o
INNER JOIN payments p ON p.order_id = o.id AND p.provider = 'mercado_pago'
SET o.revenue_confirmed_at = COALESCE(o.revenue_confirmed_at, p.updated_at)
WHERE p.status = 'approved';

ALTER TABLE whatsapp_purchase_requests
  ADD COLUMN revenue_confirmed_at TIMESTAMP NULL AFTER total_in_cents,
  ADD COLUMN archived_at TIMESTAMP NULL AFTER revenue_confirmed_at,
  ADD INDEX idx_whatsapp_reporting (archived_at, revenue_confirmed_at, created_at);
