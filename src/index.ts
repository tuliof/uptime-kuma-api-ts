/**
 * uptime-kuma-api-ts
 *
 * A TypeScript SDK for Uptime Kuma v2, built with Bun.
 * Connects via Socket.IO to allow programmatic control of monitors,
 * notifications, status pages, maintenance windows, and more.
 */

// Sub-clients (for advanced usage / type references)
export { ApiKeysClient } from './api/api-keys'
export { DatabaseClient } from './api/database'
export { DockerHostsClient } from './api/docker-hosts'
export { MaintenanceClient } from './api/maintenance'
export { MonitorsClient } from './api/monitors'
export { NotificationsClient } from './api/notifications'
export { ProxiesClient } from './api/proxies'
export { SettingsClient } from './api/settings'
export { StatusPagesClient } from './api/status-pages'
export { TagsClient } from './api/tags'
export { TwoFactorClient } from './api/two-factor'
// Main client
export { UptimeKumaApi, type UptimeKumaApiConfig } from './client'
// Errors
export { AuthenticationError, ConnectionError, Timeout, UptimeKumaError } from './errors'
// Logger
export {
  ConsoleLogger,
  createLogger,
  type LogContext,
  type Logger,
  type LogLevel,
  SilentLogger,
} from './logger'
// Socket wrapper
export { SocketWrapper } from './socket'
// Types & schemas
export * from './types/index'

// Utility helpers
export {
  convertMonitorNotificationIds,
  convertMonitorNotificationIdsToDict,
  genSecret,
  intToBool,
  parseValue,
} from './utils'
