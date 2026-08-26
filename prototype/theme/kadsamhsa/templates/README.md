# KADSAMHSA theme templates — Phase 1

Mustache overrides for Boost parent theme. Key templates:

| Template | Purpose |
|----------|---------|
| `head.mustache` | Google Fonts (Fraunces + Outfit), viewport |
| `navbar.mustache` | Branded header + mobile drawer nav |
| `footer.mustache` | Site footer with links |
| `drawers.mustache` | Main layout shell (hero, catalogue, dashboard injection) |
| `frontpage_hero.mustache` | WHO Academy-style landing hero |
| `catalogue_header.mustache` | Search + filter toolbar |
| `course_detail_hero.mustache` | Course detail with enrol CTA |
| `learner_dashboard.mustache` | Dashboard welcome, courses, certs, payments |
| `org_dashboard.mustache` | Organization dashboard shell |
| `verify_certificate.mustache` | Public cert verification wrapper |
| `cert_download.mustache` | Certificate PDF download UI |
| `mod_customcert/verify_certificate_results.mustache` | Styled verify results |

Sync to Moodle: `scripts/sync-theme.sh`
