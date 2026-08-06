# Update and rollback

1. Create and verify an instance backup.
2. Build the new version in a new timestamped release directory.
3. Run `npm ci`, environment validation, tests, build, and `deploy:verify`.
4. Review migrations and apply them explicitly.
5. Move the `current` symlink atomically to the new release.
6. Restart systemd and verify live/ready health, public checkout, Admin, uploads, and logs.

For code rollback, repoint `current` to the previous release and restart. Do not reverse a data migration unless its reviewed rollback is compatible with data written after deployment. Use the verified database backup for a destructive database rollback, and restore uploads to a separate path before switching. Never overwrite the only working release.
