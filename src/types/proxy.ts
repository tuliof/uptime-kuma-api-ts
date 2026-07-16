import { z } from 'zod'

/**
 * Proxy protocols supported by Uptime Kuma.
 */
export const ProxyProtocolSchema = z.enum(['http', 'https', 'socks', 'socks4', 'socks5', 'socks5h'])

export type ProxyProtocol = z.infer<typeof ProxyProtocolSchema>

/** Input for adding or editing a proxy configuration. */
export const ProxyConfigSchema = z.object({
  /** Proxy protocol. */
  protocol: ProxyProtocolSchema,
  /** Proxy hostname or IP address. */
  host: z.string(),
  /** Proxy port as a string (e.g. `'3128'`). */
  port: z.string(),
  /** Require authentication when connecting. @default false */
  auth: z.boolean().default(false),
  /** Username for proxy authentication (required when `auth: true`). */
  username: z.string().nullable().optional(),
  /** Password for proxy authentication (required when `auth: true`). */
  password: z.string().nullable().optional(),
  /** Whether this proxy is currently active. @default true */
  active: z.boolean().default(true),
  /** Whether this is the default proxy for all monitors. @default false */
  default: z.boolean().default(false),
  /** Apply this proxy to existing monitors automatically. @default false */
  applyExisting: z.boolean().default(false),
})

export type ProxyConfig = z.infer<typeof ProxyConfigSchema>

/** A proxy record as returned by the API (includes id). */
export const ProxySchema = ProxyConfigSchema.extend({
  /** Unique proxy identifier. */
  id: z.number(),
})

export type Proxy = z.infer<typeof ProxySchema>
