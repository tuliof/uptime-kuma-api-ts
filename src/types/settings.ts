import { z } from 'zod'

/** Server-wide settings for Uptime Kuma. */
export const SettingsSchema = z.object({
  /** Automatically check for Uptime Kuma updates. @default true */
  checkUpdate: z.boolean().default(true),
  /** Also check for beta releases. @default false */
  checkBeta: z.boolean().default(false),
  /** Number of days to retain monitoring data. @default 180 */
  keepDataPeriodDays: z.number().default(180),
  /** Server timezone (e.g. `'America/New_York'`). @default '' (UTC) */
  serverTimezone: z.string().default(''),
  /** Default landing page. @default 'dashboard' */
  entryPage: z.string().default('dashboard'),
  /** Allow search engines to index the status pages. @default false */
  searchEngineIndex: z.boolean().default(false),
  /** Primary base URL for the instance (used in notifications). @default '' */
  primaryBaseURL: z.string().default(''),
  /** Steam Web API key for game server queries. @default '' */
  steamAPIKey: z.string().default(''),
  /** Use nscd (Name Service Cache Daemon) for DNS lookups. @default false */
  nscd: z.boolean().default(false),
  /** Cache DNS results locally. @default false */
  dnsCache: z.boolean().default(false),
  /** Path to Chrome/Chromium executable for real-browser monitoring. @default '' */
  chromeExecutable: z.string().default(''),
  /** Days before TLS certificate expiry to trigger notifications. @default [] */
  tlsExpiryNotifyDays: z.array(z.number()).default([]),
  /** Disable authentication (open access). Requires password to be set. @default false */
  disableAuth: z.boolean().default(false),
  /** Trust `X-Forwarded-For` headers from reverse proxies. @default false */
  trustProxy: z.boolean().default(false),
})

export type Settings = z.infer<typeof SettingsSchema>
