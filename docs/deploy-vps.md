# KADSAMHSA LMS — production deployment (VPS)

Deploys the locked stack — Moodle 4.5 LTS · PHP 8.2 · MariaDB 10.11 · nginx + PHP-FPM —
behind a Caddy edge proxy that obtains and renews Let's Encrypt certificates automatically.

Local dev stack: [local-bootstrap.md](local-bootstrap.md) · Version pins: [../config/versions.md](../config/versions.md)

---

## 0. What you need before you start

| Item | Notes |
|------|-------|
| VPS | 2 vCPU / 4 GB RAM / 80 GB SSD minimum for real cohorts. 2 GB works for a pilot but swap will be used during upgrades. Ubuntu 24.04 LTS recommended. |
| Domain | e.g. `lms.kadsamhsa.org`, with an **A record** (and **AAAA** if the box has IPv6) pointing at the server's public IP. Set this up *first* — Caddy cannot issue a certificate until DNS resolves. |
| SMTP relay | Mailpit is local-only. Production needs a real relay: SendGrid, Mailgun, Amazon SES, or Postmark. You need host, port 587, username and password/API key. |
| Paystack live keys | From the Paystack dashboard, for Phase 3 paid enrolment. |
| SSH key | Password login is disabled by `server-setup.sh`. |

> **Recommended sizing.** Moodle's PHP-FPM pool is the main memory consumer.
> `docker/php/www.prod.conf` ships with `pm.max_children = 30`, which suits a 4 GB box.
> On 2 GB drop it to 12; on 8 GB raise it to 60.

---

## 1. Point DNS at the server

```
Type   Name              Value                TTL
A      lms               <server-public-ip>   300
AAAA   lms               <server-ipv6>        300   (only if the VPS has IPv6)
```

Verify from your laptop before continuing — a wrong record is the single most common
cause of a failed first deploy:

```bash
dig +short lms.kadsamhsa.org
```

## 2. Prepare the server (once)

SSH in as root and run:

```bash
git clone https://github.com/Goodnessukaigwe/KADSAHMSA.git /tmp/kads
sudo bash /tmp/kads/KADSAHMSA/scripts/prod/server-setup.sh
```

This installs Docker Engine + Compose, opens only 22/80/443 in `ufw`, enables
`fail2ban` and unattended security upgrades, adds 2 GB swap on small boxes,
creates the unprivileged `kadsamhsa` deploy user, and disables SSH password login.

## 3. Clone the repo and write the environment file

```bash
su - kadsamhsa
git clone https://github.com/Goodnessukaigwe/KADSAHMSA.git /opt/kadsamhsa/app
cd /opt/kadsamhsa/app/KADSAHMSA

cp config/.env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

Generate every secret properly — do not reuse the local dev values:

```bash
openssl rand -base64 32     # run once per password
```

Fill in at minimum: `MOODLE_DOMAIN`, `ACME_EMAIL`, `MOODLE_URL`, `MOODLE_WWWROOT`,
`MOODLE_ADMIN_*`, `MYSQL_*`, `SMTP_*`. `deploy.sh` refuses to run while any
`CHANGE_ME` placeholder remains.

## 4. First deploy

```bash
./scripts/prod/deploy.sh --first-run
```

This downloads Moodle 4.5, fetches `mod_customcert` and `enrol_paystack`, builds the
PHP image, starts the stack, runs the Moodle CLI installer against your HTTPS URL,
injects the production `config.php` overrides (`sslproxy`, `cronclionly`, debug off),
configures SMTP, syncs the `kadsamhsa` theme and plugins, and activates the theme.

Expect 5–15 minutes on first run. Certificate issuance happens the moment Caddy
starts and usually takes under 30 seconds.

Watch it live in a second terminal if you like:

```bash
docker compose -f docker/docker-compose.prod.yml --env-file .env.production logs -f caddy
```

## 5. Verify

```bash
./scripts/prod/smoke-test-prod.sh
```

Checks containers, HTTPS + HTTP→HTTPS redirect, HSTS, certificate expiry, `sslproxy`,
`wwwroot`, active theme, all three plugins, a clean cron run, and that ports 8080/3306
are **not** reachable from the internet.

Then log in as your admin user and confirm by hand:

- [ ] Front page renders with KADSAMHSA branding (not Boost default)
- [ ] `/login/signup.php` works and the confirmation email actually arrives
- [ ] Site administration → Notifications shows no outstanding upgrades
- [ ] Site administration → Server → Environment is all green
- [ ] Site administration → Server → Scheduled tasks shows cron running within the last 2 minutes
- [ ] Upload a file to a course — confirms the 128 MB body limit works end to end
- [ ] Issue a test certificate from `mod_customcert`

## 6. Nightly backups

```bash
crontab -e
```

```cron
15 2 * * * cd /opt/kadsamhsa/app/KADSAHMSA && ./scripts/prod/backup.sh >> /opt/kadsamhsa/backups/backup.log 2>&1
```

Each run writes `/opt/kadsamhsa/backups/<timestamp>/` containing `db.sql.gz`,
`moodledata.tar.gz`, `config.php` and a `MANIFEST.txt`. Older than
`BACKUP_RETENTION_DAYS` (default 14) is pruned automatically.

> **On-server backups are not backups.** Copy them off the box — `rclone` to S3/B2,
> or `rsync` to another host — or a single VPS failure loses everything.

Restore:

```bash
./scripts/prod/restore.sh                    # lists available timestamps
./scripts/prod/restore.sh 20260804-021500    # destructive; asks for confirmation
```

---

## Routine operations

### Ship theme or plugin changes

```bash
cd /opt/kadsamhsa/app/KADSAHMSA
git pull
./scripts/prod/deploy.sh
```

Takes a pre-deploy backup, enables maintenance mode, rsyncs `theme/kadsamhsa/` and
`plugins/*` into the Moodle tree, runs the DB upgrade, purges caches, and lifts
maintenance mode. Add `--skip-backup` if you have just taken one.

### Moodle point releases (4.5.x → 4.5.y)

```bash
./scripts/prod/backup.sh
docker compose -f docker/docker-compose.prod.yml --env-file .env.production \
  exec -T -u www-data moodle-php php admin/cli/maintenance.php --enable
mv moodle moodle.old && ./scripts/clone-moodle.sh
cp moodle.old/config.php moodle/config.php
./scripts/prod/deploy.sh --skip-backup
# once verified:  rm -rf moodle.old
```

Stay on the 4.5 LTS line. A major version jump (4.5 → 5.x) needs a staging rehearsal
and a plugin-compatibility review first — `mod_customcert` and `enrol_paystack` are
pinned in `config/versions.md`.

### Useful commands

```bash
COMPOSE="docker compose -f docker/docker-compose.prod.yml --env-file .env.production"

$COMPOSE ps                          # what is running
$COMPOSE logs -f --tail=100 caddy    # TLS / access issues
$COMPOSE logs -f --tail=100 moodle-php   # PHP errors and slow requests
$COMPOSE restart moodle-php          # after editing www.prod.conf or php.prod.ini
$COMPOSE exec -u www-data moodle-php php admin/cli/purge_caches.php
$COMPOSE exec -u www-data moodle-php php admin/cli/maintenance.php --enable
$COMPOSE down                        # stop (volumes and data survive)
```

---

## Troubleshooting

**Caddy will not issue a certificate.**
Almost always DNS or a blocked port. Check `dig +short <domain>` returns the server IP,
that `ufw status` shows 80 and 443 open, and that nothing else on the host is bound to
port 80 (`sudo ss -lntp | grep :80`). Test against Let's Encrypt staging first by
uncommenting `acme_ca` in `docker/caddy/Caddyfile` — real certs are rate-limited to
5 failures per hour per domain.

**Redirect loop, or the site loads without CSS.**
`$CFG->sslproxy` is missing from `moodle/config.php`, or `$CFG->wwwroot` is `http://`.
Both are set by `install-moodle-prod.sh`; `smoke-test-prod.sh` checks them explicitly.

**"Database connection failed" on first run.**
The MariaDB volume was initialised with different credentials on an earlier attempt.
Either restore the old `MYSQL_PASSWORD`, or wipe and start over:
`docker compose ... down && docker volume rm kadsamhsa_prod_moodle_db` — **destroys all data**.

**Uploads fail above a certain size.**
Three limits must agree: `request_body max_size` (Caddyfile), `client_max_body_size`
(nginx/prod.conf) and `upload_max_filesize` / `post_max_size` (php.prod.ini). All ship at 128 MB.

**Site is slow under load.**
Raise `pm.max_children` in `docker/php/www.prod.conf` and `DB_BUFFER_POOL_SIZE` in
`.env.production`, then restart `moodle-php` and `db`. Check for PHP-FPM queueing with
`$COMPOSE logs moodle-php | grep -i 'server reached'`.

**Emails are not arriving.**
Site administration → Server → Email → Test outgoing mail configuration. Confirm
`SMTP_SECURITY=tls` with port 587 (not 465), that the relay allows your server's IP,
and that SPF/DKIM records exist for `MOODLE_NOREPLY_ADDRESS`'s domain.

---

## Security notes

- Only Caddy publishes ports. MariaDB, PHP-FPM and nginx are reachable only on the internal Docker network.
- `.env.production` is mode 600 and gitignored. It holds every credential — it is the one file to protect.
- `config.php` is `640 root:www-data` inside the container.
- Cron is CLI-only (`$CFG->cronclionly = true`), so `/admin/cron.php` cannot be triggered from the web.
- Web services are disabled by default; enable individually if you add a mobile app or integration.
- Rotate `MOODLE_ADMIN_PASS` after the first login and keep the admin account off shared mailboxes.
