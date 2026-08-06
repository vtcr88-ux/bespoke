# Production deployment

The supported strategy is a native Linux deployment: Nginx serves Web and Admin, systemd runs one compiled API process per store, and MySQL listens only on localhost or a private interface. PM2 and Docker are not part of the primary path and must not run the same API concurrently.

## First installation

1. Create a non-root service user and the release directories.
2. Create an exclusive MySQL database and application user.
3. Generate the admin hash with `npm run admin:create` and place only the hash in the environment file.
4. Store the protected environment at `/etc/catalog-platform/<instance-id>.env` with mode `600`.
5. Run `npm run instance:validate -- --env-file=/etc/catalog-platform/<instance-id>.env`.
6. Run `ENV_FILE=... npm run db:migrate:prod`.
7. Optionally seed an entirely empty catalog and storefront with `ENV_FILE=... npm run db:seed:prod -- --confirm-initial`.
8. Configure safe public build variables in each `.env.production` file.
9. Run `npm ci`, `npm run verify`, and `npm run deploy:verify`.
10. Run `npm run instance:render -- --env-file=/etc/catalog-platform/<instance-id>.env` and install the generated Nginx and systemd files.
11. Start the API and run `npm run healthcheck`.

`npm run start:prod` starts only `apps/api/dist/server.js`. It does not run Vite, migrations, seed, or hot reload. Production API startup also does not auto-create or migrate tables.

For a short diagnostic without systemd, use `ENV_FILE=/etc/catalog-platform/<instance-id>.env npm run start:prod` behind the same local-only binding. This is the prepared fallback, not a persistent production strategy; stop it before enabling the systemd unit so two API processes never run concurrently.

## Release layout

Use `/opt/catalog-platform/<instance-id>/releases/<timestamp>` and a `current` symlink. Keep uploads in `/var/lib/catalog-platform/<instance-id>/uploads`; never place uploads or environment files inside a release. Multiple stores may point their `current` symlink to the same release content, but each API process must keep its own environment file, port, database and uploads directory.

Do not use `npm run dev`, `vite preview`, an exposed Node port, or an exposed MySQL port in production.
