# Deployment checklist

- [ ] Instance has exclusive database, DB user, environment, secrets, admin, uploads, domains, and backups.
- [ ] `npm ci`, `npm run verify`, `npm run build`, and `npm run deploy:verify` pass.
- [ ] Environment validation and explicit migrations pass.
- [ ] Initial seed was skipped for updates.
- [ ] Web/Admin builds are served by Nginx; Node and MySQL ports are private.
- [ ] systemd is enabled at boot and graceful restart is tested.
- [ ] Live and ready health checks pass.
- [ ] Upload persistence survives a release switch.
- [ ] Backup checksum and isolated restore test pass.
- [ ] Public checkout shows shipping as WhatsApp arrangement, never free or zero.
- [ ] Mercado Pago webhook signature, amount validation, idempotency, and return polling pass.
- [ ] Admin messages and manual delivery states work on mobile and desktop.
- [ ] Final DNS, TLS, CORS, Secure cookies, Cloudflare, and Mercado Pago URLs are reviewed.
