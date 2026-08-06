# Production database

Bind MySQL to localhost or a private interface and keep port 3306 closed externally. Create one database and one non-root user per instance. Enter passwords interactively; never place them in versioned SQL.

```sql
CREATE DATABASE instance_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'instance_app'@'127.0.0.1' IDENTIFIED BY '<interactive-secret>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON instance_name.* TO 'instance_app'@'127.0.0.1';
```

Run `npm run db:migrate:prod` explicitly before restarting a new release. Migrations are ordered and recorded in `schema_migrations`. `004_manual_shipping_and_payment_confirmation.sql` preserves historical shipping values and makes unknown shipping nullable. Routine startup never runs migrations or seed.

Use `db:seed:prod -- --confirm-initial` only for an empty first installation. It refuses a database that already contains products or storefront settings and applies the matching instance `brand.seed.json` in the same transaction as the catalog seed. Test restoration against a separate database before relying on a backup.
