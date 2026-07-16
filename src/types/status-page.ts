import { z } from 'zod'

/**
 * Incident display styles for status page incidents.
 *
 * - `info`: Blue (informational)
 * - `warning`: Yellow (minor issue)
 * - `danger`: Red (major outage)
 * - `primary`: Blue-grey (general)
 * - `light`: Light grey (subtle)
 * - `dark`: Dark (serious)
 */
export const IncidentStyleSchema = z.enum(['info', 'warning', 'danger', 'primary', 'light', 'dark'])

export type IncidentStyle = z.infer<typeof IncidentStyleSchema>

/** A status page incident. */
export const IncidentSchema = z.object({
  /** Incident title (e.g. `'API Degraded Performance'`). */
  title: z.string(),
  /** Detailed incident description or update. */
  content: z.string(),
  /** Visual style for the incident banner. @default 'primary' */
  style: IncidentStyleSchema.default('primary'),
})

export type Incident = z.infer<typeof IncidentSchema>

/** Status page configuration. */
export const StatusPageConfigSchema = z.object({
  /** Unique status page identifier. */
  id: z.number(),
  /** URL slug (e.g. `'status'` makes the page available at `/status`). */
  slug: z.string(),
  /** Page title shown in the browser tab and header. */
  title: z.string(),
  /** Optional description or subtitle. */
  description: z.string().nullable().optional(),
  /** Path to the custom icon. @default '/icon.svg' */
  icon: z.string().default('/icon.svg'),
  /** Color theme. @default 'auto' */
  theme: z.enum(['auto', 'light', 'dark']).default('auto'),
  /** Whether the status page is publicly published. @default true */
  published: z.boolean().default(true),
  /** Display monitor tags on the status page. @default false */
  showTags: z.boolean().default(false),
  /** Custom domain list for this status page. @default [] */
  domainNameList: z.array(z.object({ domain: z.string() })).default([]),
  /** Google Analytics measurement ID. */
  googleAnalyticsId: z.string().nullable().optional(),
  /** Custom CSS to inject into the page. @default '' */
  customCSS: z.string().default(''),
  /** Custom footer text. */
  footerText: z.string().nullable().optional(),
  /** Show "Powered by Uptime Kuma" badge. @default true */
  showPoweredBy: z.boolean().default(true),
  /** Show SSL/TLS certificate expiry info. @default false */
  showCertificateExpiry: z.boolean().default(false),
})

export type StatusPageConfig = z.infer<typeof StatusPageConfigSchema>
