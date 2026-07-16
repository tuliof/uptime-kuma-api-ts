import { z } from 'zod'

/**
 * Maintenance window strategies.
 *
 * - `manual`: Manually activated — stays active until paused
 * - `single`: Runs once on a specific date range
 * - `recurring-interval`: Repeats every N days
 * - `recurring-weekday`: Repeats on specific weekdays
 * - `recurring-day-of-month`: Repeats on specific days of the month
 * - `cron`: Custom cron expression
 */
export const MaintenanceStrategySchema = z.enum([
  'manual',
  'single',
  'recurring-interval',
  'recurring-weekday',
  'recurring-day-of-month',
  'cron',
])

export type MaintenanceStrategy = z.infer<typeof MaintenanceStrategySchema>

/** Input for adding or editing a maintenance window. */
export const MaintenanceConfigSchema = z.object({
  /** Human-readable title for this maintenance window. */
  title: z.string(),
  /** Maintenance strategy that defines the schedule. */
  strategy: MaintenanceStrategySchema,
  /** Whether this maintenance is currently active. @default true */
  active: z.boolean().default(true),
  /** Free-text description of the maintenance purpose. @default '' */
  description: z.string().default(''),
  /**
   * Start and end timestamps (ISO 8601).
   * Required for `single` strategy.
   * Example: `['2025-12-01T02:00:00Z', '2025-12-01T04:00:00Z']`
   */
  dateRange: z.array(z.string()).optional(),
  /**
   * Interval in days between recurring maintenance windows.
   * Used by `recurring-interval` strategy.
   * @minimum 1 @maximum 3650
   * @default 1
   */
  intervalDay: z.number().min(1).max(3650).default(1),
  /**
   * Days of the week (0 = Sunday, 6 = Saturday).
   * Used by `recurring-weekday` strategy.
   * @default []
   */
  weekdays: z.array(z.number()).default([]),
  /**
   * Days of the month (e.g. `['1', '15']`).
   * Used by `recurring-day-of-month` strategy.
   * @default []
   */
  daysOfMonth: z.array(z.string()).default([]),
  /**
   * Start and end time within each maintenance day.
   * Each entry has `hours` (0-23) and `minutes` (0-59).
   * Example: `[{ hours: 2, minutes: 0 }, { hours: 4, minutes: 0 }]`
   */
  timeRange: z.array(z.object({ hours: z.number(), minutes: z.number() })).optional(),
  /**
   * Cron expression for scheduling.
   * Used by `cron` strategy.
   * @default '30 3 * * *'
   */
  cron: z.string().default('30 3 * * *'),
  /**
   * Duration of each maintenance window in minutes.
   * @default 60
   */
  durationMinutes: z.number().default(60),
  /** IANA timezone identifier (e.g. `'America/New_York'`). */
  timezoneOption: z.string().nullable().optional(),
})

export type MaintenanceConfig = z.infer<typeof MaintenanceConfigSchema>

/** A maintenance window record as returned by the API (includes id). */
export const MaintenanceSchema = MaintenanceConfigSchema.extend({
  /** Unique maintenance identifier. */
  id: z.number(),
})

export type Maintenance = z.infer<typeof MaintenanceSchema>
