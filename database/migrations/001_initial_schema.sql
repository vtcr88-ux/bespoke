CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(24),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(64) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  recipient_name VARCHAR(120) NOT NULL,
  street VARCHAR(160) NOT NULL,
  number VARCHAR(30) NOT NULL,
  complement VARCHAR(80),
  district VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state CHAR(2) NOT NULL,
  postal_code VARCHAR(12) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_addresses_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permissions (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id CHAR(36) NOT NULL,
  permission_id CHAR(36) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(240),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sku VARCHAR(48) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  subtitle VARCHAR(160),
  description TEXT NOT NULL,
  price_in_cents INT UNSIGNED NOT NULL,
  compare_at_price_in_cents INT UNSIGNED,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT chk_products_price CHECK (price_in_cents > 0)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id CHAR(36) PRIMARY KEY,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  public_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(160) NOT NULL,
  width INT UNSIGNED NOT NULL,
  height INT UNSIGNED NOT NULL,
  content_type VARCHAR(80) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  created_by CHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product_images (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  media_asset_id CHAR(36) NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_product_images_media FOREIGN KEY (media_asset_id) REFERENCES media_assets(id),
  INDEX idx_product_images_product_position (product_id, position)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  movement_type ENUM('adjustment','reservation','release','sale','refund') NOT NULL,
  quantity_delta INT NOT NULL,
  reason VARCHAR(240) NOT NULL,
  actor_user_id CHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_inventory_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS carts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  public_reference VARCHAR(40) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id CHAR(36) PRIMARY KEY,
  cart_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id),
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_cart_items_quantity CHECK (quantity > 0),
  UNIQUE KEY uq_cart_items_product (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  public_reference VARCHAR(40) NOT NULL UNIQUE,
  status ENUM('draft','pending_payment','paid','preparing','shipped','delivered','cancelled','refunded') NOT NULL,
  subtotal_in_cents INT UNSIGNED NOT NULL,
  discount_in_cents INT UNSIGNED NOT NULL DEFAULT 0,
  shipping_in_cents INT UNSIGNED NOT NULL DEFAULT 0,
  total_in_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  sales_channel ENUM('online','whatsapp') NOT NULL DEFAULT 'online',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_orders_status_created (status, created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  sku VARCHAR(48) NOT NULL,
  unit_price_in_cents INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  discount_in_cents INT UNSIGNED NOT NULL DEFAULT 0,
  subtotal_in_cents INT UNSIGNED NOT NULL,
  image_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  previous_status VARCHAR(40),
  new_status VARCHAR(40) NOT NULL,
  actor_user_id CHAR(36),
  reason VARCHAR(240),
  request_id VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_status_history_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  provider ENUM('mercado_pago') NOT NULL,
  provider_payment_id VARCHAR(120),
  status ENUM('created','pending','approved','rejected','cancelled','refunded') NOT NULL,
  amount_in_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_payments_provider_payment (provider, provider_payment_id)
);

CREATE TABLE IF NOT EXISTS payment_refunds (
  id CHAR(36) PRIMARY KEY,
  payment_id CHAR(36) NOT NULL,
  provider_refund_id VARCHAR(120),
  amount_in_cents INT UNSIGNED NOT NULL,
  reason VARCHAR(240) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id CHAR(36) PRIMARY KEY,
  provider ENUM('mercado_pago') NOT NULL,
  external_event_id VARCHAR(160) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  processing_status ENUM('received','ignored','processed','failed') NOT NULL DEFAULT 'received',
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_webhook_event (provider, external_event_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id CHAR(36) PRIMARY KEY,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  operation VARCHAR(120) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_hash CHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_purchase_requests (
  id CHAR(36) PRIMARY KEY,
  public_reference VARCHAR(40) NOT NULL UNIQUE,
  status ENUM('contact_requested','conversation_started','quote_confirmed','awaiting_payment','converted_to_order','completed','cancelled') NOT NULL,
  subtotal_in_cents INT UNSIGNED NOT NULL,
  discount_in_cents INT UNSIGNED NOT NULL DEFAULT 0,
  shipping_in_cents INT UNSIGNED NOT NULL DEFAULT 0,
  total_in_cents INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_request_items (
  id CHAR(36) PRIMARY KEY,
  request_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_name VARCHAR(120) NOT NULL,
  sku VARCHAR(48) NOT NULL,
  unit_price_in_cents INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  subtotal_in_cents INT UNSIGNED NOT NULL,
  image_url VARCHAR(500),
  CONSTRAINT fk_whatsapp_items_request FOREIGN KEY (request_id) REFERENCES whatsapp_purchase_requests(id),
  CONSTRAINT fk_whatsapp_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS report_exports (
  id CHAR(36) PRIMARY KEY,
  report_type VARCHAR(80) NOT NULL,
  requested_by CHAR(36) NOT NULL,
  status ENUM('queued','completed','failed') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_report_exports_user FOREIGN KEY (requested_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS store_settings (
  id CHAR(36) PRIMARY KEY,
  setting_key VARCHAR(120) NOT NULL UNIQUE,
  setting_value JSON NOT NULL,
  updated_by CHAR(36),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_store_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  actor_user_id CHAR(36),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id CHAR(36),
  reason VARCHAR(240),
  request_id VARCHAR(80),
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at)
);
