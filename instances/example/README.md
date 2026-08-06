# Instance: example

This directory contains configuration templates only. It does not contain a copy of the application.

## Provisioning checklist

- [ ] Create an exclusive MySQL database and user.
- [ ] Generate unique session and CSRF secrets outside the repository.
- [ ] Generate the administrator password hash with `npm run admin:create`.
- [ ] Create `/var/lib/catalog-platform/example/uploads` with restricted permissions.
- [ ] Configure the public, admin and API domains.
- [ ] Configure Mercado Pago credentials and the signed payment webhook.
- [ ] Run migrations, optional initial seed, build and readiness checks.
- [ ] Configure independent backups and test restoration.
