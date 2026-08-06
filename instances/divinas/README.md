# Instance: divinas

This directory contains configuration templates only. It does not contain a copy of the application.

## Provisioning checklist

- [ ] Copy `.env.example` to `.env` locally or to `/etc/catalog-platform/divinas.env` on the VPS.
- [ ] Keep `.env` out of Git and fill unique secrets, Mercado Pago credentials and Admin credentials.
- [ ] Confirm the production domains before using the placeholders in this template.
- [ ] Create an exclusive MySQL database and user with `npm run instance:db:provision -- --instance=divinas --confirm`.
- [ ] Generate the administrator password hash with `npm run admin:create`.
- [ ] Create `/var/lib/catalog-platform/divinas/uploads` with restricted permissions.
- [ ] Render Nginx and systemd files with `npm run instance:render -- --instance=divinas`.
- [ ] Run migrations, optional initial seed, build and readiness checks.
- [ ] Configure independent backups and test restoration.
