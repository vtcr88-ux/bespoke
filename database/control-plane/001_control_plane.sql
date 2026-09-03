CREATE TABLE IF NOT EXISTS control_instances (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(63) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  public_domain VARCHAR(253) NOT NULL UNIQUE,
  admin_domain VARCHAR(253) NOT NULL UNIQUE,
  api_domain VARCHAR(253) NOT NULL UNIQUE,
  api_port SMALLINT UNSIGNED NOT NULL UNIQUE,
  owner_email VARCHAR(254) NOT NULL,
  whatsapp_phone VARCHAR(15) NOT NULL DEFAULT '',
  notes VARCHAR(500) NOT NULL DEFAULT '',
  status ENUM('draft','prepared','provisioning','active','failed','suspended') NOT NULL,
  last_error_code VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS control_instance_events (
  id CHAR(36) PRIMARY KEY,
  instance_id CHAR(36) NOT NULL,
  type ENUM('created','prepared','status_changed','preparation_failed') NOT NULL,
  message VARCHAR(240) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_control_events_instance_created (instance_id, created_at),
  CONSTRAINT fk_control_events_instance FOREIGN KEY (instance_id)
    REFERENCES control_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
