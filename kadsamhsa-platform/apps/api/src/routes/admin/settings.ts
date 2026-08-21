import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SchoolSettings } from '@kadsamhsa/domain';
import { ApiError, emailSchema } from '@kadsamhsa/domain';
import { recordAudit } from '../../audit.js';
import { queryOne, transaction } from '../../db/pool.js';

/**
 * School settings (PRD A9; wireframe "School settings").
 *
 * `school_settings` is a singleton — one row, keyed `id BOOLEAN PRIMARY KEY
 * DEFAULT TRUE`, seeded by migration 007. Branding lives in the database rather
 * than in env vars precisely so KADSAMHSA staff can change it themselves
 * without a redeploy, which is the self-management principle in PRD §1.
 *
 * This file also serves the one unauthenticated read the marketing site needs
 * (`GET /settings/public`). That route returns a deliberately narrow subset:
 * the operational fields (custom domain, who last edited) are staff-only.
 */

/**
 * The branding subset safe to hand to an anonymous caller. Written as an
 * explicit `Pick` — and mapped field by field below rather than spread — so a
 * sensitive column added to `SchoolSettings` later cannot leak by default.
 */
export type PublicSchoolSettings = Pick<
  SchoolSettings,
  | 'siteName'
  | 'tagline'
  | 'logoUrl'
  | 'primaryColour'
  | 'accentColour'
  | 'contactEmail'
  | 'contactPhone'
  | 'contactAddress'
  | 'supportUrl'
>;

/* -------------------------------------------------------------------------- */
/* Request validation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Colours are interpolated into a `style` attribute and a CSS custom property
 * by the web app, so anything other than an exact six-digit hex value is a CSS
 * injection vector (`red;background:url(...)`). Rejected outright rather than
 * stripped: silently rewriting a colour would hand staff a value they did not
 * choose and hide the fact that their input was dangerous.
 */
const colourSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Enter a six-digit hex colour, for example #0b4d2c');

/**
 * The logo and support links are rendered into `src`/`href`. Only http(s) and
 * site-relative paths (assets this platform serves) are accepted, which keeps
 * `javascript:` and `data:` URLs out of the markup.
 */
const urlSchema = z
  .string()
  .trim()
  .min(1, 'Enter a URL')
  .max(2048)
  .refine((value) => {
    if (value.startsWith('/') && !value.startsWith('//')) {
      return true;
    }
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter an http(s) URL');

/**
 * A bare hostname: no scheme, no path, no port, no spaces. The value is used to
 * build absolute links and TLS configuration, so `https://x.org/` or
 * `x.org/path` would produce a broken URL rather than a helpful one.
 */
const customDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
    'Enter a bare hostname, for example academy.kadsamhsa.org',
  );

/**
 * A cleared form field arrives as `''`, which means "unset" — not "a URL that
 * happens to be empty". Both spellings land as NULL.
 */
const nullableUrlSchema = urlSchema.nullable().or(z.literal('').transform(() => null));

const nullableCustomDomainSchema = customDomainSchema
  .nullable()
  .or(z.literal('').transform(() => null));

/** Digits and the usual punctuation only: the number becomes a `tel:` link. */
const phoneSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^[0-9+()\s-]*$/, 'Use digits, spaces and + ( ) - only');

/**
 * Every field is optional: the settings form saves one section at a time, and
 * a PATCH that carried the whole record would let a stale tab overwrite a
 * colleague's edit to a section it never displayed.
 */
const settingsPatchSchema = z.object({
  siteName: z.string().trim().min(2, 'Enter the school name').max(120).optional(),
  tagline: z.string().trim().max(300).optional(),
  logoUrl: nullableUrlSchema.optional(),
  primaryColour: colourSchema.optional(),
  accentColour: colourSchema.optional(),
  contactEmail: emailSchema.optional(),
  contactPhone: phoneSchema.optional(),
  contactAddress: z.string().trim().max(300).optional(),
  customDomain: nullableCustomDomainSchema.optional(),
  supportUrl: nullableUrlSchema.optional(),
});

type SettingsPatch = z.infer<typeof settingsPatchSchema>;

/** Ordered so the generated UPDATE reads the same way every time. */
const COLUMN_BY_FIELD: Record<keyof SettingsPatch, string> = {
  siteName: 'site_name',
  tagline: 'tagline',
  logoUrl: 'logo_url',
  primaryColour: 'primary_colour',
  accentColour: 'accent_colour',
  contactEmail: 'contact_email',
  contactPhone: 'contact_phone',
  contactAddress: 'contact_address',
  customDomain: 'custom_domain',
  supportUrl: 'support_url',
};

/* -------------------------------------------------------------------------- */
/* Row shape and mapping                                                       */
/* -------------------------------------------------------------------------- */

interface SettingsRow {
  site_name: string;
  tagline: string;
  logo_url: string | null;
  primary_colour: string;
  accent_colour: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  custom_domain: string | null;
  support_url: string | null;
  updated_at: Date;
}

const SETTINGS_COLUMNS = `
  site_name, tagline, logo_url, primary_colour, accent_colour,
  contact_email, contact_phone, contact_address, custom_domain, support_url,
  updated_at
`;

function toSettings(row: SettingsRow): SchoolSettings {
  return {
    siteName: row.site_name,
    tagline: row.tagline,
    logoUrl: row.logo_url,
    primaryColour: row.primary_colour,
    accentColour: row.accent_colour,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactAddress: row.contact_address,
    customDomain: row.custom_domain,
    supportUrl: row.support_url,
    updatedAt: row.updated_at.toISOString(),
  };
}

function toPublicSettings(settings: SchoolSettings): PublicSchoolSettings {
  return {
    siteName: settings.siteName,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl,
    primaryColour: settings.primaryColour,
    accentColour: settings.accentColour,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    contactAddress: settings.contactAddress,
    supportUrl: settings.supportUrl,
  };
}

/**
 * The one read path. `LIMIT 1` rather than a lookup by id: the row is a
 * singleton, and there is no second row for the limit to choose between.
 */
async function loadSettings(): Promise<SchoolSettings> {
  const row = await queryOne<SettingsRow>(
    `SELECT ${SETTINGS_COLUMNS} FROM school_settings LIMIT 1`,
  );
  if (!row) {
    // Migration 007 seeds this row, so its absence is a broken deployment
    // rather than anything the caller did or can fix.
    throw new ApiError('internal_error', 'School settings have not been initialised');
  }
  return toSettings(row);
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

export async function adminSettingsRoutes(app: FastifyInstance) {
  app.get('/admin/settings', {
    preHandler: app.requirePermission('settings:manage'),
    handler: (): Promise<SchoolSettings> => loadSettings(),
  });

  app.patch('/admin/settings', {
    preHandler: app.requirePermission('settings:manage'),
    handler: async (request): Promise<SchoolSettings> => {
      const user = request.currentUser!;
      // A body-less PATCH is a no-op, not a parse failure.
      const input = settingsPatchSchema.parse(request.body ?? {});

      const sets: string[] = [];
      const params: unknown[] = [];
      const changed: string[] = [];

      for (const [field, column] of Object.entries(COLUMN_BY_FIELD)) {
        const value = input[field as keyof SettingsPatch];
        // Absent means "leave alone"; an explicit null clears a nullable field.
        if (value === undefined) {
          continue;
        }
        params.push(value);
        sets.push(`${column} = $${params.length}`);
        changed.push(field);
      }

      if (sets.length === 0) {
        // Nothing to write, so nothing to audit and no reason to move
        // updated_at — that timestamp should mean "last actually changed".
        return loadSettings();
      }

      params.push(user.id);
      sets.push(`updated_by = $${params.length}`, 'updated_at = now()');

      const row = await transaction(async (client) => {
        const result = await client.query<SettingsRow>(
          `UPDATE school_settings
              SET ${sets.join(', ')}
            WHERE id = TRUE
            RETURNING ${SETTINGS_COLUMNS}`,
          params,
        );
        const updated = result.rows[0];
        if (!updated) {
          throw new ApiError('internal_error', 'School settings have not been initialised');
        }

        // Keys only. The values include contact details and, in future, keys
        // for third-party integrations; the audit log is read by more people
        // than can edit these settings.
        await recordAudit(
          {
            actorId: user.id,
            action: 'settings.updated',
            subjectType: 'settings',
            subjectId: 'school',
            metadata: { changed },
            ipAddress: request.ip,
          },
          client,
        );
        return updated;
      });

      return toSettings(row);
    },
  });

  /**
   * Public branding. Unauthenticated on purpose: the marketing site renders the
   * logo, palette and contact block before anyone signs in, and gating that
   * behind an admin session would leave the front page unbranded.
   */
  app.get('/settings/public', {
    handler: async (_request, reply): Promise<PublicSchoolSettings> => {
      const settings = await loadSettings();
      // Branding changes rarely and this route is hit by every anonymous
      // visitor, so a short shared cache keeps the front page off the database.
      return reply
        .header('Cache-Control', 'public, max-age=60')
        .send(toPublicSettings(settings));
    },
  });
}
