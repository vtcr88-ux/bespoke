# Domain and HTTPS later

No real DNS or certificate is configured by this repository. When domains are available:

1. Create DNS records for public, admin, and API hosts.
2. Confirm they resolve to the intended origin.
3. Issue certificates only after validation succeeds.
4. Replace Nginx placeholders and enable HTTP-to-HTTPS redirects.
5. Update `CORS_ORIGINS`, `PUBLIC_API_URL`, `PUBLIC_WEB_URL`, Web/Admin API URLs, and trusted Cloudflare origin rules.
6. Configure the Mercado Pago return URLs and signed payment webhook with the final HTTPS API host.
7. Validate Secure cookies, TLS, webhook delivery, and payment return polling.

Cloudflare Access may protect the full Admin host later, but internal Admin authentication remains mandatory. Cloudflare DNS, Tunnel, WAF, rate limits, and origin protection must use per-instance credentials stored outside Git.
