CREATE TABLE IF NOT EXISTS storefront_setting_revisions (
  id CHAR(36) PRIMARY KEY,
  setting_key VARCHAR(120) NOT NULL,
  setting_value JSON NOT NULL,
  revision_source VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_storefront_setting_revisions_lookup (setting_key, created_at)
);

INSERT INTO storefront_setting_revisions (
  id,
  setting_key,
  setting_value,
  revision_source,
  created_at
)
SELECT
  UUID(),
  settings.setting_key,
  settings.setting_value,
  'migration_baseline',
  settings.updated_at
FROM store_settings settings
WHERE settings.setting_key = 'storefront.visual'
  AND NOT EXISTS (
    SELECT 1
    FROM storefront_setting_revisions revisions
    WHERE revisions.setting_key = settings.setting_key
  );
