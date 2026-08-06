# systemd

Generate the per-instance unit with `npm run instance:render -- --env-file=/etc/catalog-platform/<instance-id>.env`, or replace all placeholders in `infra/systemd/catalog-api.service.template`, then install it as `/etc/systemd/system/catalog-api-<instance-id>.service`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now catalog-api-<instance-id>
sudo systemctl status catalog-api-<instance-id>
sudo journalctl -u catalog-api-<instance-id> -f
```

The unit runs as a non-root account, reads an external environment file, restarts after failures, writes only to the instance upload directory, and logs to journald. Verify that the chosen Node path is correct with `command -v node` before installation.

Run one unit per store. Each unit must use a different `EnvironmentFile`, `PORT`, database and `ReadWritePaths` upload directory.

For rollback, repoint the `current` symlink to the prior release, run `systemctl restart`, then check `/health/ready`. Do not combine this unit with PM2 or a Docker API container.
