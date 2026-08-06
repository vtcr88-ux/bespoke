# White-label instance deployment

Each brand is an independent single-tenant installation. The server environment selects one API port, database, upload root, Mercado Pago credentials and public URLs; neither frontend sends `tenantId` or `clientId`. There is no store selector in the customer Admin, so one customer cannot switch into another store.

The Bespoke Admin keeps the Bespoke platform identity. Only the public storefront is white-label: brand, logo, colors, SEO, WhatsApp, products, orders, reports and payment integration belong to the active instance.

## One VPS, many isolated stores

A single Oracle VPS can run one codebase and many isolated API processes:

```text
Nginx public/admin/API domains
  -> catalog-api-divinas.service on 127.0.0.1:3333
  -> catalog-api-outra-loja.service on 127.0.0.1:3334
  -> catalog-api-mais-uma.service on 127.0.0.1:3335

MySQL
  -> divinas database and user
  -> outra_loja database and user
  -> mais_uma database and user

Uploads
  -> /var/lib/catalog-platform/divinas/uploads
  -> /var/lib/catalog-platform/outra-loja/uploads
  -> /var/lib/catalog-platform/mais-uma/uploads
```

The Web and Admin builds are reusable. In production set both frontends to `VITE_API_BASE_URL=/api`; Nginx decides which isolated API receives the request based on the domain.

Create configuration templates with:

```bash
npm run instance:create -- --slug=nome-da-marca --public-domain=loja.com.br --admin-domain=admin.loja.com.br --api-domain=api.loja.com.br
```

The command rejects invalid or duplicate slugs, chooses the next available API port when `--port` is omitted, and creates only configuration, feature, seed, compose override, and checklist files. It never duplicates source code, generates secrets, or overwrites an instance.

Copy the generated `.env.example` to a protected real environment file:

```bash
cp instances/nome-da-marca/.env.example instances/nome-da-marca/.env
```

For production, store it outside Git:

```bash
sudo install -m 600 instances/nome-da-marca/.env /etc/catalog-platform/nome-da-marca.env
```

Provision a unique MySQL database/user, session and CSRF secrets, Admin email/hash, Mercado Pago credentials, domains, CORS allowlist, upload directory, systemd unit, Nginx sites, and backup path.

Useful instance commands:

```bash
npm run instance:list
npm run instance:validate -- --instance=nome-da-marca
MYSQL_ADMIN_URL=mysql://root:senha@127.0.0.1:3306/mysql npm run instance:db:provision -- --instance=nome-da-marca --confirm
npm run db:migrate:prod -- --instance=nome-da-marca
npm run db:seed:prod -- --instance=nome-da-marca --confirm-initial
npm run instance:render -- --instance=nome-da-marca
npm run instance:api -- --instance=nome-da-marca
```

PowerShell equivalent for the MySQL admin URL:

```powershell
$env:MYSQL_ADMIN_URL = "mysql://root:senha@127.0.0.1:3306/mysql"
npm run instance:db:provision -- --instance=nome-da-marca --confirm
```

During the first installation, `npm run db:seed:prod -- --instance=<id> --confirm-initial` applies the instance `brand.seed.json` only when both the catalog and storefront settings are empty. Routine updates never run this seed and never overwrite settings maintained in Admin.

The public and Admin domains remain deployment environment values. Visual brand data, including legal name, logos, favicon, contact email, SEO, theme, layout and Motion preset, is initialized from the brand seed and then maintained in the responsive Admin interface. The Admin preview resolves the correct public URL through the authenticated `/admin/runtime` endpoint, so one shared Admin build can serve multiple stores safely.

## Isolation rules

- Never reuse `DATABASE_URL`, `DATABASE_NAME`, `DATABASE_USER`, `SESSION_SECRET`, `CSRF_SECRET`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `UPLOADS_DIR`, or `PORT` between stores.
- Never expose a Node API port publicly. Nginx should proxy each domain to `127.0.0.1:<PORT>`.
- Never let the public site proxy `/api/admin/*`; the public Nginx template blocks it.
- Never put a real instance `.env` in Git. Only `.env.example` and `.env.production.example` are versioned.
- Keep one customer Admin domain tied to exactly one API process. A customer should not choose store IDs from the browser.
