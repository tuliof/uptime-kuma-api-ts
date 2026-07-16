import { z } from 'zod'

/** An API key record as returned by Uptime Kuma. */
export const ApiKeySchema = z.object({
  /** Unique API key identifier. */
  id: z.number(),
  /** Human-readable name for this API key. */
  name: z.string(),
  /** The actual API key token (only shown on creation). */
  key: z.string().optional(),
  /** ISO date string when this key expires, or `null` for no expiry. */
  expires: z.string().nullable().optional(),
  /** Whether this API key is currently enabled. */
  active: z.boolean(),
  /** ISO timestamp when this key was created. */
  createdAt: z.string().optional(),
})

export type ApiKey = z.infer<typeof ApiKeySchema>

/** Input for creating an API key. */
export const AddApiKeyInputSchema = z.object({
  /** Human-readable name for the new API key. */
  name: z.string().min(1),
  /**
   * ISO date string when the key expires.
   * Omit or leave empty for a non-expiring key.
   */
  expires: z.string().optional(),
  /** Whether the key should be active immediately. @default true */
  active: z.boolean().default(true),
})

export type AddApiKeyInput = z.infer<typeof AddApiKeyInputSchema>
