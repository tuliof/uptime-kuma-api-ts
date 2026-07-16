import { z } from 'zod'

/**
 * Notification provider types supported by Uptime Kuma.
 * This is a large surface — Uptime Kuma supports 90+ providers
 * (Slack, Discord, email, Telegram, webhook, etc.).
 *
 * The full provider list with per-provider options will be populated in a future release.
 * For now, any non-empty string is accepted for forward compatibility.
 */
export const NotificationTypeSchema = z.string().min(1)

export type NotificationType = z.infer<typeof NotificationTypeSchema>

/** Input for adding or editing a notification provider. */
export const NotificationConfigSchema = z.object({
  /** Human-readable name for this notification configuration. */
  name: z.string(),
  /** Provider type identifier (e.g. `'slack'`, `'smtp'`, `'webhook'`). */
  type: NotificationTypeSchema,
  /** Use this as the default notification for new monitors. @default false */
  isDefault: z.boolean().default(false),
  /** Apply this notification to existing monitors automatically. @default false */
  applyExisting: z.boolean().default(false),
})

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>

/** A notification provider record as returned by the API (includes id). */
export const NotificationSchema = NotificationConfigSchema.extend({
  /** Unique notification identifier. */
  id: z.number(),
})

export type Notification = z.infer<typeof NotificationSchema>
