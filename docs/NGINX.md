# Nginx

1. Copy `infra/nginx/rate-limits.conf` into the Nginx `http` context.
2. Copy `infra/nginx/security-headers.conf` to `/etc/nginx/snippets/catalog-security-headers.conf`.
3. Generate per-instance sites with `npm run instance:render -- --env-file=/etc/catalog-platform/<instance-id>.env`, or manually replace `__PUBLIC_DOMAIN__`, `__ADMIN_DOMAIN__`, `__API_DOMAIN__`, `__APP_ROOT__`, and `__API_PORT__` in the three site templates.

The public site uses CSP `frame-ancestors` to authorize only its own origin and
the configured Admin domain. This is required by the real-time Storefront
preview when Public and Admin use different domains. Admin remains protected by
`X-Frame-Options: SAMEORIGIN`, and the API uses `DENY`.
4. Enable the generated sites, run `nginx -t`, then reload Nginx.

The public host blocks `/api/admin/*`. The admin host proxies its API with upload-sized body limits. The API host exposes only webhooks, health checks, and immutable uploads. React Router uses `try_files`; `index.html` is not cached, while versioned assets are immutable.

Each store's Node process binds to localhost on its own port. Do not open those ports in the firewall. Add TLS only after DNS points to the VPS and certificate validation succeeds. After TLS, redirect HTTP to HTTPS and re-run checkout and webhook tests for each instance.
