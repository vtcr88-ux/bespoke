# Oracle VPS setup

First identify the OS with `cat /etc/os-release`. On Ubuntu/Debian use `apt`; on Oracle Linux/RHEL use `dnf`. Install a supported Node.js 20+ release, Nginx, MySQL client/server as appropriate, `tar`, `gzip`, and `rsync` from trusted repositories.

Use a named administrative user with SSH keys. Disable direct root login and password authentication only after confirming key access in another session. Create a dedicated service account without an interactive shell, `/opt/catalog-platform/<instance>/releases`, `/var/lib/catalog-platform/<instance>/uploads`, `/var/backups/catalog-platform`, and `/etc/catalog-platform` with least-privilege ownership.

Allow inbound SSH from controlled sources and HTTP/HTTPS only. Keep Node and MySQL ports closed in both the OS firewall (`ufw` or `firewalld`) and Oracle Cloud ingress rules. Do not apply commands blindly; record existing rules before changes so they can be restored.

Validate Nginx syntax, systemd status, journald logs, MySQL bind address, file ownership, backup integrity, and `/health/ready`. Domain, TLS, Cloudflare, and Mercado Pago production credentials are later manual steps.

## Persistent storage

For uploads independent from application releases, attach an OCI Block Volume
and mount it persistently before creating the instance upload directory. Use a
stable device path and the Oracle-recommended `fstab` options so a temporary
volume issue does not prevent the VPS from booting. Do not attach the same
filesystem read/write to multiple instances without a cluster-aware filesystem.

Point `UPLOADS_DIR` and the systemd `ReadWritePaths` entry to the mounted
persistent path. Assign a Block Volume backup policy, but retain the existing
transactional MySQL dump plus uploads archive: a volume snapshot alone is not a
database-consistent application backup. Copy verified archives to encrypted OCI
Object Storage and apply a lifecycle/retention policy.

Oracle references: [attach and mount a Block Volume](https://docs.oracle.com/en-us/iaas/Content/Block/Tasks/attach-compute-volume-attachment.htm), [Block Volume backups](https://docs.oracle.com/en-us/iaas/Content/Block/Concepts/blockvolumebackups.htm), and [Object Storage lifecycle policies](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usinglifecyclepolicies.htm).
