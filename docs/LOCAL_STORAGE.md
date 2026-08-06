# Local storage

Local development uses the same persistence model prepared for production:
MySQL stores catalog, settings, orders and payment state; the filesystem stores
validated image uploads. JSON storage is an explicit development fallback only.

## Current Windows setup

MySQL 8 may run natively on `127.0.0.1:3306`. Keep
`COMMERCE_STORAGE=mysql`, configure the protected `DATABASE_URL` in
`apps/api/.env`, and use an ignored upload directory such as
`storage/bespoke-local/uploads`.

Run the versioned migrations, seed and storage probe:

```powershell
npm run storage:prepare
```

The probe checks the MySQL connection, applied migrations, table counts and
read/write access to the upload directory without printing credentials.

When moving an existing development instance from JSON to MySQL, inspect the
safe migration summary first and confirm only after reviewing it. Storefront
settings are skipped by default so an old JSON file cannot replace a customized
brand:

```powershell
npm run storage:import-file
npm run storage:import-file -- --confirm
npm run storage:check
```

The importer refuses file stores containing orders or checkout access tokens
and refuses mismatched catalog IDs. It copies only validated products; webhook
event IDs are intentionally not treated as portable payment evidence.

Import storefront settings only as a separately reviewed operation:

```powershell
npm run storage:import-file -- --include-storefront
npm run storage:import-file -- --include-storefront --confirm
```

When MySQL already contains customized storefront settings, replacement also
requires `--overwrite-custom-storefront`. The importer writes the current state
to the ignored `storage/recovery` directory before replacing it. MySQL keeps a
database revision before every subsequent storefront update.

## Optional Docker MySQL

Docker Desktop is a local convenience, not a production dependency. The
provided Compose file binds MySQL only to `127.0.0.1` and persists its data in
the named volume `bespoke_mysql`.

Do not run native MySQL and the Compose MySQL on port `3306` simultaneously.
Stop one implementation before starting the other.

```powershell
docker compose up -d mysql
docker compose ps
npm run storage:prepare
```

To validate Docker while keeping native MySQL and the current API untouched,
bind the container to a temporary host port. This does not change
`DATABASE_URL`; the application continues using its current database:

```powershell
$env:BESPOKE_MYSQL_HOST_PORT = "3307"
docker compose up -d mysql
docker compose ps
```

Only switch `DATABASE_URL` after creating and verifying a database backup and
explicitly importing the intended data into the Docker database.

Stopping or recreating the container does not delete the named volume. Never
use `docker compose down -v` for routine work because `-v` deletes local MySQL
data.

## File fallback

To diagnose the application without MySQL, set `COMMERCE_STORAGE=file` only in
a development environment. The API then uses
`database/dev-commerce-store.json`. Production rejects this mode at startup.

## Oracle mapping

On Oracle Linux or Ubuntu, use MySQL bound to localhost and set `UPLOADS_DIR`
to `/var/lib/catalog-platform/<instance>/uploads`. Keep uploads and environment
files outside release directories. Run migrations explicitly before restarting
the API and copy verified database/upload backups to encrypted off-host storage.
