# KADSAMHSA LMS — version pins (Phase 0)

| Component | Version / pin | Notes |
|-----------|---------------|--------|
| Moodle | **4.5 LTS** (`MOODLE_405_STABLE`) — verified **4.5.12+** | Prefer official tarball: `https://download.moodle.org/download.php/direct/stable405/moodle-latest-405.tgz` (git clone via `scripts/clone-moodle.sh` also supported) |
| PHP | **8.2** | `docker/php/Dockerfile` based on `php:8.2-fpm-bookworm` |
| Database | **MariaDB 10.11** | Docker service `db` |
| Web | **nginx + PHP-FPM** | `docker/nginx`, `docker/php` |
| Theme | `theme_kadsamhsa` | Boost child; develop in `theme/kadsamhsa/` |
| Certificates | `mod_customcert` **4.4.10** | [mdjnelson/moodle-mod_customcert](https://github.com/mdjnelson/moodle-mod_customcert) branch `MOODLE_404_STABLE` |
| Payments | `enrol_paystack` **1.4.1** (tag `v1.2.2`) | [PaystackHQ/plugin-moodle-enrol](https://github.com/PaystackHQ/plugin-moodle-enrol) |
| Orgs | Moodle cohorts + `local_orgs` **0.1.0** | Scaffold only in Phase 0 (not IOMAD) |
| Local email | **Mailpit** | SMTP `:1025`, UI `:8025` (local only — production uses a real SMTP relay) |
| Edge proxy (prod) | **Caddy 2.8** | Automatic Let's Encrypt TLS, HTTP→HTTPS redirect, HSTS |

## Plugin sources (Phase 0)

### mod_customcert

- **Choice:** Mark Nelson’s Custom Certificate (`mod_customcert`)
- **Source:** `https://github.com/mdjnelson/moodle-mod_customcert` (ZIP of branch)
- **Branch:** `MOODLE_404_STABLE` (no `MOODLE_405_STABLE` upstream; 4.4.10 requires Moodle 4.4+, installs cleanly on 4.5.12+)
- **Deploy path:** `moodle/mod/customcert`
- **Working copy:** `plugins/customcert`
- **Fetch:** `./scripts/fetch-plugins.sh`

### enrol_paystack

- **Choice:** Official Paystack Moodle enrolment plugin (`enrol_paystack`) from PaystackHQ
- **Source:** `https://github.com/PaystackHQ/plugin-moodle-enrol` tag **`v1.2.2`** (plugin release string `1.4.1`, `requires` 3.6+)
- **Why this plugin:** Well-known PaystackHQ-maintained enrol plugin for paid courses. Installed and upgraded without errors on Moodle 4.5.12+ in Phase 0 smoke.
- **Deploy path:** `moodle/enrol/paystack`
- **Working copy:** `plugins/enrol_paystack`
- **Keys:** `PAYSTACK_*` placeholders in `.env` only; wire test keys in Phase 3

### local_orgs

- **Choice:** In-repo scaffold on top of Moodle cohorts (not IOMAD)
- **Source:** `plugins/local_orgs` (this repository)
- **Deploy path:** `moodle/local/orgs`
- **Phase 0 bar:** plugin skeleton + `version.php`; CSV/invite UX in Phase 3

## Environments

| Env | Stack | Notes |
|-----|--------|--------|
| Local | Docker Compose (`docker/`) | Moodle `http://localhost:8080`, Mailpit `http://localhost:8025` |
| Staging | Same as production, separate host/domain | Same version pins as production |
| Production | Docker Compose (`docker/docker-compose.prod.yml`) + Caddy TLS | KADSAMHSA domain; runbook in `docs/deploy-vps.md` |

## Theme convention

Develop in `theme/kadsamhsa/` → sync to `moodle/theme/kadsamhsa/` via `scripts/sync-theme.sh`.
