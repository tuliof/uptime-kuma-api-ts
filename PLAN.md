# Feature Implementation Plan

TypeScript SDK for Uptime Kuma v2, built with Bun.
Communicates via Socket.IO to manage monitors, notifications,
status pages, maintenance windows, and other Uptime Kuma resources.

## Progress Legend

- [ ] Not started
- [x] Complete
- [~] In progress
- [!] Blocked

---

## Phase 1: Project Scaffolding (COMPLETE)

- [x] Configure package.json (dependencies, scripts, metadata)
- [x] Configure tsconfig.json + tsconfig.build.json
- [x] Configure biome.json (lint + format)
- [x] Configure bunfig.toml (test runner, coverage thresholds)
- [x] Create docker-compose.yml (Uptime Kuma v2 container for testing)
- [x] Create .env.example
- [x] Configure .releaserc.json + CI workflows (ci.yml, release.yml)
- [x] Set up husky pre-commit hook
- [x] Create scripts/setup-kuma-credentials.ts
- [x] Create tests/helpers.ts (setupUptimeKuma, waitForUptimeKuma, cleanupAllMonitors)
- [x] Create tests/integration.test.ts base (testcontainers smoke test)
- [x] Create src/ directory structure (all stub files)
- [x] Install dependencies and verify build/lint/test pass

---

## Phase 2: Core Foundation

### 2.1 Error Types (`src/errors.ts`) — DONE

- [x] `UptimeKumaError` (base class with optional code field)
- [x] `Timeout` (extends UptimeKumaError)
- [x] `ConnectionError` (extends UptimeKumaError)
- [x] `AuthenticationError` (extends UptimeKumaError)
- [x] Unit tests for error hierarchy

### 2.2 Logger (`src/logger.ts`) — DONE

- [x] `Logger` interface (debug, info, warn, error with LogContext)
- [x] `SilentLogger` (default no-op)
- [x] `ConsoleLogger` (level-based with formatted output)
- [x] `createLogger(level)` factory
- [x] Unit tests for logger level filtering

### 2.3 Utility Helpers (`src/utils.ts`) — DONE

- [x] `intToBool(data, keys)` — pure function, returns new object with 0/1 → boolean
- [x] `parseValue(data, key, type, default)` — pure function, fills null fields
- [x] `convertMonitorNotificationIds(monitor)` — pure function, dict → array
- [x] `convertMonitorNotificationIdsToDict(data)` — pure function, array → dict
- [x] `genSecret(length)` — cryptographically random alphanumeric string
- [x] Unit tests for all utility functions
- [ ] Add `transformMonitorPayload(input)` — filter irrelevant fields per monitor type
- [ ] Add `buildMonitorData(input)` — construct full monitor payload with defaults
- [ ] Add `buildMaintenanceData(input)` — construct maintenance payload with defaults
- [ ] Add `buildStatusPageData(input)` — construct status page payload with defaults
- [ ] Add `buildNotificationData(input)` — construct notification payload with defaults
- [ ] Add `buildProxyData(input)` — construct proxy payload with defaults
- [ ] Add `buildDockerHostData(input)` — construct docker host payload with defaults
- [ ] Add `buildTagData(input)` — construct tag payload with defaults
- [ ] Add `buildApiKeyData(input)` — construct API key payload with defaults

### 2.4 Type Definitions (`src/types/`) — DONE

- [x] `monitor.ts` — MonitorType (22 values), MonitorStatus (4), MonitorConfig, Monitor, AddMonitorInput, EditMonitorInput, Heartbeat, Tag, AddTagInput, EditTagInput
- [x] `auth.ts` — AuthMethod (5 values)
- [x] `api-key.ts` — ApiKey, AddApiKeyInput
- [x] `event.ts` — 18 socket event names + CACHED_EVENTS list
- [x] `proxy.ts` — ProxyProtocol (6), ProxyConfig, Proxy
- [x] `status-page.ts` — IncidentStyle (6), Incident, StatusPageConfig
- [x] `docker.ts` — DockerType (2), DockerHostConfig, DockerHost
- [x] `maintenance.ts` — MaintenanceStrategy (6), MaintenanceConfig, Maintenance
- [x] `notification.ts` — NotificationType (permissive), NotificationConfig, Notification
- [x] `settings.ts` — Settings schema
- [x] `index.ts` — re-exports all types
- [ ] Expand NotificationType with full 90+ provider enum
- [ ] Add notification_provider_options map (per-provider required/optional fields)
- [ ] Add notification_provider_conditions map (per-provider min/max constraints)
- [ ] Unit tests for all schema validations

### 2.5 Socket Wrapper (`src/socket.ts`) — DONE

- [x] `SocketWrapper` class wrapping socket.io-client Socket
- [x] `emitWithAck<T>(event, ...args)` — promise-based emit/callback
- [x] `getEventData(event)` — deferred-resolver (no polling), resolves when event handler fires
- [x] `getCachedEventData(event)` — synchronous cached read
- [x] `waitForEvent(event)` — one-time event listener
- [x] `clearEventData()` — reset all cached data
- [x] `getSocket()` — access underlying socket
- [x] Event handler registration for all 18 events
- [x] Heartbeat list caching with append + cap at 150
- [x] Important heartbeat list caching with prepend
- [x] Unit tests with mocked socket
- [ ] Add `waitEvents` delay for multi-message buffering
- [ ] Handle monitorList empty case (return [] for monitor-dependent events)

### 2.6 Main Client (`src/client.ts`) — DONE

- [x] `UptimeKumaApi` class with `UptimeKumaApiConfig`
- [x] `connect()` — establish Socket.IO connection
- [x] `disconnect()` — close connection
- [x] `login(username, password, token)` — credential + 2FA login
- [x] `loginByToken(token)` — JWT token login
- [x] `logout()` — end session
- [x] `needSetup()` — check if initial setup needed
- [x] `setup(username, password)` — create admin user
- [x] `info()` — get server info (cached event)
- [x] `version` getter — server version string
- [x] `getHeartbeats()` — cached heartbeat list
- [x] `getImportantHeartbeats()` — cached important heartbeats
- [x] `avgPing()` — cached average ping
- [x] `certInfo()` — cached certificate info
- [x] `uptime()` — cached uptime data
- [x] Sub-client lazy getters: monitors, tags, notifications, proxies, statusPages, maintenance, dockerHosts, apiKeys, settings, twoFactor, database
- [x] `ensureConnected()` guard
- [x] `ensureAuthenticated()` guard
- [ ] Integration test: connect + login + info + version
- [ ] Add `apiKey` config option for token-based auth (loginByToken on connect)
- [ ] Add reconnection handling (clear event data on reconnect)
- [ ] Add `sslVerify` option support (rejectUnauthorized for self-signed certs)

---

## Phase 3: Monitors (Primary Feature)

### 3.1 MonitorsClient (`src/api/monitors.ts`) — DONE

- [x] `get(id)` — getMonitor event
- [x] `list()` — monitorList cached event
- [x] `add(input)` — add event (Zod-validated)
- [x] `edit(id, input)` — editMonitor event (merge with existing)
- [x] `delete(id)` — deleteMonitor event
- [x] `pause(id)` — pauseMonitor event
- [x] `resume(id)` — resumeMonitor event
- [x] `getBeats(id, hours)` — getMonitorBeats event
- [x] `getGameList()` — getGameList event
- [x] `testChrome(executable)` — testChrome event
- [x] `getStatus(monitorId)` — derive status from cached heartbeats
- [x] `addTag(tagId, monitorId, value)` — addMonitorTag event
- [x] `deleteTag(tagId, monitorId, value)` — deleteMonitorTag event
- [x] `clearEvents(id)` — clearEvents event
- [x] `clearHeartbeats(id)` — clearHeartbeats event
- [x] Zod validation on `add(input)` — parsed with AddMonitorInputSchema
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Apply `convertMonitorNotificationIdsToDict` in add/edit payload transforms
- [ ] Apply `intToBool` + parse transforms on get/list returns
- [ ] Apply `convertMonitorNotificationIds` on get/list returns
- [ ] Add `waitEvents` delay after monitorList for multi-message buffering
- [ ] Wait for monitorList event refresh after add/edit/delete
- [ ] Add default databaseConnectionString per monitor type (SQLSERVER, POSTGRES, MYSQL, REDIS, MONGODB)
- [ ] Add default pushToken generation for PUSH type (genSecret(10))
- [ ] Add default port for DNS (53) and RADIUS (1812) types
- [ ] Integration test: add HTTP monitor, verify, edit, pause, resume, delete
- [ ] Integration test: add keyword monitor, verify keyword field
- [ ] Integration test: add JSON query monitor, verify jsonPath/expectedValue
- [ ] Integration test: getBeats returns heartbeat array
- [ ] Integration test: getGameList returns game array
- [ ] Integration test: monitor tag add/delete lifecycle
- [ ] Integration test: clearEvents + clearHeartbeats

### 3.2 TagsClient (`src/api/tags.ts`) — DONE

- [x] `list()` — getTags event
- [x] `get(id)` — filter from list
- [x] `add(input)` — addTag event (with `new: true` flag)
- [x] `edit(id, input)` — editTag event
- [x] `delete(id)` — deleteTag event
- [x] Properly typed with `Tag`, `AddTagInput`, `EditTagInput`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Integration test: add tag, get, edit, delete

### 3.3 Monitor & Tag Unit Tests

- [ ] Unit test: MonitorConfigSchema validates all 22 monitor types
- [ ] Unit test: MonitorConfigSchema enforces required fields per type
- [ ] Unit test: MonitorConfigSchema validates accepted_statuscodes values
- [ ] Unit test: MonitorConfigSchema validates dns_resolve_type values
- [ ] Unit test: MonitorConfigSchema validates kafkaProducerSaslOptions.mechanism
- [ ] Unit test: TagSchema validates name + color
- [ ] Unit test: AddTagInputSchema validates required fields
- [ ] Unit test: buildMonitorData applies correct defaults per type

---

## Phase 4: Notifications & Proxies

### 4.1 NotificationsClient (`src/api/notifications.ts`) — DONE

- [x] `list()` — notificationList cached event
- [x] `get(id)` — filter from list
- [x] `test(input)` — testNotification event
- [x] `add(input)` — addNotification event (id=null)
- [x] `edit(id, input)` — addNotification event (with id)
- [x] `delete(id)` — deleteNotification event
- [x] `checkApprise()` — checkApprise event
- [x] Properly typed with `Notification`, `NotificationConfig`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Expand NotificationTypeSchema with full 90+ provider list
- [ ] Add provider_options map (required/optional fields per provider type)
- [ ] Add provider_conditions map (min/max constraints per field)
- [ ] Zod validation on add/edit with provider-specific rules
- [ ] Wait for notificationList event refresh after add/edit/delete
- [ ] Integration test: add notification, get, edit, delete
- [ ] Integration test: checkApprise returns boolean
- [ ] Integration test: test notification (mock provider)

### 4.2 ProxiesClient (`src/api/proxies.ts`) — DONE

- [x] `list()` — proxyList cached event
- [x] `get(id)` — filter from list
- [x] `add(input)` — addProxy event (id=null)
- [x] `edit(id, input)` — addProxy event (with id)
- [x] `delete(id)` — deleteProxy event
- [x] Properly typed with `Proxy`, `ProxyConfig`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Zod validation on add/edit with required field checks
- [ ] Wait for proxyList event refresh after add/edit/delete
- [ ] Integration test: add proxy, get, edit, delete

---

## Phase 5: Status Pages & Maintenance

### 5.1 StatusPagesClient (`src/api/status-pages.ts`) — DONE

- [x] `list()` — statusPageList cached event
- [x] `get(slug)` — getStatusPage event + REST GET /api/status-page/{slug}
- [x] `add(slug, title)` — addStatusPage event
- [x] `delete(slug)` — deleteStatusPage event
- [x] `save(slug, input)` — saveStatusPage event
- [x] `postIncident(slug, input)` — postIncident event
- [x] `unpinIncident(slug)` — unpinIncident event
- [x] Properly typed with `StatusPageConfig`, `Incident`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Implement REST fetch for status page config (GET /api/status-page/{slug}/config, /incidents, /status-page-list)
- [ ] Combine socket + REST data in `get(slug)` for full response
- [ ] Validate theme (auto/light/dark) via Zod schema
- [ ] Wait for statusPageList event refresh after add/delete/save
- [ ] Call `saveStatusPage` after postIncident/unpinIncident
- [ ] Integration test: add status page, get, save config, delete
- [ ] Integration test: post incident, unpin incident

### 5.2 MaintenanceClient (`src/api/maintenance.ts`) — DONE

- [x] `list()` — maintenanceList cached event
- [x] `get(id)` — getMaintenance event
- [x] `add(input)` — addMaintenance event
- [x] `edit(id, input)` — editMaintenance event
- [x] `delete(id)` — deleteMaintenance event
- [x] `pause(id)` — pauseMaintenance event
- [x] `resume(id)` — resumeMaintenance event
- [x] `getMonitors(id)` — getMonitorMaintenance event
- [x] `addMonitors(id, monitors)` — addMonitorMaintenance event
- [x] `getStatusPages(id)` — getMaintenanceStatusPage event
- [x] `addStatusPages(id, statusPages)` — addMaintenanceStatusPage event
- [x] Properly typed with `Maintenance`, `MaintenanceConfig`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Zod validation on add/edit with required fields per strategy
- [ ] Add `buildMaintenanceData` helper (defaults for dateRange, timeRange, weekdays, daysOfMonth)
- [ ] Wait for maintenanceList event refresh after delete
- [ ] Integration test: add maintenance (manual strategy), get, edit, pause, resume, delete
- [ ] Integration test: add maintenance (recurring-interval), verify intervalDay
- [ ] Integration test: monitor association (addMonitors, getMonitors)
- [ ] Integration test: status page association (addStatusPages, getStatusPages)

---

## Phase 6: Admin Features

### 6.1 DockerHostsClient (`src/api/docker-hosts.ts`) — DONE

- [x] `list()` — dockerHostList cached event
- [x] `get(id)` — filter from list
- [x] `test(input)` — testDockerHost event
- [x] `add(input)` — addDockerHost event (id=null)
- [x] `edit(id, input)` — addDockerHost event (with id)
- [x] `delete(id)` — deleteDockerHost event
- [x] Properly typed with `DockerHost`, `DockerHostConfig`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Zod validation on add/edit
- [ ] Add `buildDockerHostData` helper (default dockerDaemon per type)
- [ ] Wait for dockerHostList event refresh after add/edit/delete
- [ ] Integration test: add docker host (socket type), get, edit, delete
- [ ] Integration test: test docker host connection

### 6.2 ApiKeysClient (`src/api/api-keys.ts`) — DONE

- [x] `list()` — apiKeyList cached event
- [x] `get(id)` — filter from list
- [x] `add(input)` — addAPIKey event
- [x] `enable(id)` — enableAPIKey event
- [x] `disable(id)` — disableAPIKey event
- [x] `delete(id)` — deleteAPIKey event
- [x] Properly typed with `ApiKey`, `AddApiKeyInput`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Zod validation on add (name, expires, active)
- [ ] Wait for apiKeyList event refresh after add/enable/disable/delete
- [ ] Integration test: add API key, get, enable, disable, delete

### 6.3 SettingsClient (`src/api/settings.ts`) — DONE

- [x] `get()` — getSettings event
- [x] `set(input)` — setSettings event
- [x] `changePassword(old, new)` — changePassword event
- [x] `uploadBackup(json, handle)` — uploadBackup event
- [x] `clearStatistics()` — clearStatistics event
- [x] Properly typed with `Settings`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Validate password is required when disableAuth is true (Zod refine)
- [ ] Validate importHandle is one of skip/overwrite/keep
- [ ] Integration test: get settings, set settings, verify change
- [ ] Integration test: change password
- [ ] Integration test: clear statistics

### 6.4 TwoFactorClient (`src/api/two-factor.ts`) — DONE

- [x] `status()` — twoFAStatus event
- [x] `prepare(password)` — prepare2FA event
- [x] `verifyToken(token, password)` — verifyToken event
- [x] `save(password)` — save2FA event
- [x] `disable(password)` — disable2FA event
- [x] Properly typed with `TwoFAStatus`, `Prepare2FAResponse`, `VerifyTokenResponse`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Integration test: 2FA prepare + verify + save + disable lifecycle
- [ ] Integration test: twofa_status returns correct state

### 6.5 DatabaseClient (`src/api/database.ts`) — DONE

- [x] `getSize()` — getDatabaseSize event
- [x] `shrink()` — shrinkDatabase event
- [x] Properly typed with `DatabaseSize`
- [x] Consistent error handling with `UptimeKumaError`
- [ ] Integration test: getDatabaseSize returns size info
- [ ] Integration test: shrinkDatabase completes

---

## Cross-Cutting Concerns

### Response Transform Layer

- [ ] Standardize `intToBool` application across all sub-clients (active, important, etc.)
- [ ] Standardize enum parsing across all sub-clients (MonitorType, AuthMethod, ProxyProtocol, etc.)
- [ ] Add response type narrowing (replace `unknown` casts with typed schemas)
- [ ] Add Zod `.transform()` pipelines for automatic response normalization

### Test Infrastructure

- [ ] Create shared integration test setup (per-suite container, cleanup helpers)
- [ ] Add test data cleanup in afterAll for each sub-client test suite
- [ ] Add per-feature integration test files:
  - [ ] `tests/integration/monitors.test.ts`
  - [ ] `tests/integration/tags.test.ts`
  - [ ] `tests/integration/notifications.test.ts`
  - [ ] `tests/integration/proxies.test.ts`
  - [ ] `tests/integration/status-pages.test.ts`
  - [ ] `tests/integration/maintenance.test.ts`
  - [ ] `tests/integration/docker-hosts.test.ts`
  - [ ] `tests/integration/api-keys.test.ts`
  - [ ] `tests/integration/settings.test.ts`
  - [ ] `tests/integration/two-factor.test.ts`
  - [ ] `tests/integration/database.test.ts`

### Documentation

- [ ] Write README.md with installation, usage, and API reference
- [ ] Add JSDoc to all public methods
- [ ] Add usage examples for each sub-client
- [ ] Document error handling patterns
- [ ] Document event caching behavior

### Polish

- [ ] Ensure all socket events match Uptime Kuma v2 exactly
- [ ] Add connection state machine (disconnected → connecting → connected → authenticated)
- [ ] Add type-safe event emitter for real-time events (heartbeat, monitorList updates)

---

## Socket Event Reference (60 call events + 18 handler events)

### Call Events (emit + ack)

| Event | Method | Phase |
|-------|--------|-------|
| `getMonitor` | monitors.get | 3 |
| `add` | monitors.add | 3 |
| `editMonitor` | monitors.edit | 3 |
| `deleteMonitor` | monitors.delete | 3 |
| `pauseMonitor` | monitors.pause | 3 |
| `resumeMonitor` | monitors.resume | 3 |
| `getMonitorBeats` | monitors.getBeats | 3 |
| `getGameList` | monitors.getGameList | 3 |
| `testChrome` | monitors.testChrome | 3 |
| `addMonitorTag` | monitors.addTag | 3 |
| `deleteMonitorTag` | monitors.deleteTag | 3 |
| `clearEvents` | monitors.clearEvents | 3 |
| `clearHeartbeats` | monitors.clearHeartbeats | 3 |
| `getTags` | tags.list | 3 |
| `addTag` | tags.add | 3 |
| `editTag` | tags.edit | 3 |
| `deleteTag` | tags.delete | 3 |
| `testNotification` | notifications.test | 4 |
| `addNotification` | notifications.add/edit | 4 |
| `deleteNotification` | notifications.delete | 4 |
| `checkApprise` | notifications.checkApprise | 4 |
| `addProxy` | proxies.add/edit | 4 |
| `deleteProxy` | proxies.delete | 4 |
| `getStatusPage` | statusPages.get | 5 |
| `addStatusPage` | statusPages.add | 5 |
| `deleteStatusPage` | statusPages.delete | 5 |
| `saveStatusPage` | statusPages.save | 5 |
| `postIncident` | statusPages.postIncident | 5 |
| `unpinIncident` | statusPages.unpinIncident | 5 |
| `getMaintenance` | maintenance.get | 5 |
| `addMaintenance` | maintenance.add | 5 |
| `editMaintenance` | maintenance.edit | 5 |
| `deleteMaintenance` | maintenance.delete | 5 |
| `pauseMaintenance` | maintenance.pause | 5 |
| `resumeMaintenance` | maintenance.resume | 5 |
| `getMonitorMaintenance` | maintenance.getMonitors | 5 |
| `addMonitorMaintenance` | maintenance.addMonitors | 5 |
| `getMaintenanceStatusPage` | maintenance.getStatusPages | 5 |
| `addMaintenanceStatusPage` | maintenance.addStatusPages | 5 |
| `testDockerHost` | dockerHosts.test | 6 |
| `addDockerHost` | dockerHosts.add/edit | 6 |
| `deleteDockerHost` | dockerHosts.delete | 6 |
| `addAPIKey` | apiKeys.add | 6 |
| `enableAPIKey` | apiKeys.enable | 6 |
| `disableAPIKey` | apiKeys.disable | 6 |
| `deleteAPIKey` | apiKeys.delete | 6 |
| `getSettings` | settings.get | 6 |
| `setSettings` | settings.set | 6 |
| `changePassword` | settings.changePassword | 6 |
| `uploadBackup` | settings.uploadBackup | 6 |
| `clearStatistics` | settings.clearStatistics | 6 |
| `twoFAStatus` | twoFactor.status | 6 |
| `prepare2FA` | twoFactor.prepare | 6 |
| `verifyToken` | twoFactor.verifyToken | 6 |
| `save2FA` | twoFactor.save | 6 |
| `disable2FA` | twoFactor.disable | 6 |
| `login` | client.login | 2 |
| `loginByToken` | client.loginByToken | 2 |
| `logout` | client.logout | 2 |
| `needSetup` | client.needSetup | 2 |
| `setup` | client.setup | 2 |
| `getDatabaseSize` | database.getSize | 6 |
| `shrinkDatabase` | database.shrink | 6 |

### Handler Events (sio.on, cached)

| Event | Cached In | Used By | Phase |
|-------|-----------|---------|-------|
| `connect` | — | client.connect | 2 |
| `disconnect` | — | client.disconnect | 2 |
| `monitorList` | eventData | monitors.list | 2 |
| `notificationList` | eventData | notifications.list | 2 |
| `proxyList` | eventData | proxies.list | 2 |
| `statusPageList` | eventData | statusPages.list | 2 |
| `heartbeatList` | eventData | client.getHeartbeats | 2 |
| `importantHeartbeatList` | eventData | client.getImportantHeartbeats | 2 |
| `avgPing` | eventData | client.avgPing | 2 |
| `uptime` | eventData | client.uptime | 2 |
| `heartbeat` | appends to heartbeatList | real-time updates | 2 |
| `info` | eventData | client.info, client.version | 2 |
| `certInfo` | eventData | client.certInfo | 2 |
| `dockerHostList` | eventData | dockerHosts.list | 2 |
| `autoLogin` | eventData | client.login (auto) | 2 |
| `initServerTimezone` | — | (no-op) | 2 |
| `maintenanceList` | eventData | maintenance.list | 2 |
| `apiKeyList` | eventData | apiKeys.list | 2 |

---

## Priority Order

1. **Phase 2 remaining**: Unit tests for errors, logger, utils, socket, schemas
2. **Phase 3**: Full MonitorsClient implementation + tests (most-used feature)
3. **Phase 4**: Notifications + Proxies (alerting infrastructure)
4. **Phase 5**: Status Pages + Maintenance (operational features)
5. **Phase 6**: Admin features (Docker hosts, API keys, Settings, 2FA, Database)
6. **Cross-cutting**: Response transforms, test infrastructure, documentation, polish
