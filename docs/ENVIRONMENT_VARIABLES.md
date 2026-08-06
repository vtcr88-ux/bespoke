# Environment variables

## Private API variables

`NODE_ENV`, `PORT`, `INSTANCE_ID`, `DATABASE_URL`, `COMMERCE_STORAGE`, `SESSION_SECRET`, `CSRF_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_TTL_MINUTES`, `CORS_ORIGINS`, `TRUSTED_HOSTS`, `LOG_LEVEL`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `WHATSAPP_STORE_PHONE`, `PUBLIC_API_URL`, `PUBLIC_WEB_URL`, and `UPLOADS_DIR` are required for production.

Backup and provisioning scripts additionally use `PUBLIC_DOMAIN`, `ADMIN_DOMAIN`, `API_DOMAIN`, `APP_ROOT`, `SERVICE_USER`, `SERVICE_GROUP`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and optional `DATABASE_GRANT_HOST`. Keep the environment file outside Git with mode `600`. Every instance must have different database credentials, session secret, CSRF secret, admin identity, Mercado Pago credentials, API port, upload path, and origins.

`INSTANCE_ID` uses lowercase letters, numbers, and hyphens. `COMMERCE_STORAGE` must be `mysql` in production; `file` is an explicit local fallback. `UPLOADS_DIR` must be absolute in production. Public URLs must use HTTPS. `CORS_ORIGINS` is a comma-separated allowlist and never accepts `*` for authenticated routes.

## Public build variables

Web and Admin use `VITE_API_BASE_URL` and `VITE_ENVIRONMENT`. Admin can optionally use `VITE_STOREFRONT_PREVIEW_URL` as a local fallback, but production should normally leave it empty and let the authenticated `/admin/runtime` endpoint return the instance `PUBLIC_WEB_URL`. Never expose database credentials, session/CSRF secrets, Mercado Pago access tokens, webhook secrets, VPS credentials, or Cloudflare tokens in `VITE_*`.

For local development, keep `VITE_API_BASE_URL=http://localhost:3333` in the Web and Admin environment files for the active store. In production, `/api` uses the same-origin Nginx proxy and avoids cross-origin session cookies. The same built Web/Admin assets can serve multiple domains because Nginx routes each domain to that store's isolated API port.

Automatic Correios shipping is not part of the current checkout. Do not add legacy `CORREIOS_*` variables: new orders persist shipping as undefined until the store and customer arrange delivery or pickup through WhatsApp.

The root production example contains deployment placeholders only. The API example contains no real values.
