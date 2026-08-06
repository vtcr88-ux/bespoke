# Backup and restore

Set `ENV_FILE` to the protected instance environment and run `scripts/backup-instance`. The script creates a restricted archive containing a transactional MySQL dump, uploads, and instance configuration. It verifies gzip/tar integrity, creates SHA-256 metadata, includes the instance ID, and removes archives older than `BACKUP_RETENTION_DAYS` (default 14).

After installing a release on Linux, mark both scripts executable with `chmod 750 scripts/backup-instance scripts/restore-instance` and keep ownership restricted to the service operations group.

Copy archives to encrypted off-host storage. A local archive is not disaster recovery. Monitor exit status and the final `Backup verified` line.

Restore only into an isolated target:

```bash
ENV_FILE=/etc/catalog-platform/restore-test.env \
  scripts/restore-instance /var/backups/catalog-platform/archive.tar.gz --confirm
```

The checksum, expected archive entries and instance ID are checked before the database import. Uploads are extracted to a separate `.restored` path instead of overwriting the live directory. The protected environment copy is restored beside that path, never inside a web-served upload directory. Point the test environment at a separate database, validate counts, images, Admin login, checkout status, and `/health/ready`, then document the restore date and result.
