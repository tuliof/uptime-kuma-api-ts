# API Reference

All domain operations are accessed through **lazy-loaded sub-clients** on the main `UptimeKumaApi` instance. Each sub-client shares the same socket connection.

```ts
import { UptimeKumaApi } from 'uptime-kuma-api-ts'

const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
await api.connect()
await api.login('admin', 'admin123')

api.monitors   // → MonitorsClient
api.tags       // → TagsClient
api.notifications // → NotificationsClient
// … etc
```

---

## `api.monitors` — Monitor CRUD + lifecycle

| Method                              | Description                                  |
| ----------------------------------- | -------------------------------------------- |
| `monitors.get(id)`                  | Get a single monitor by ID                   |
| `monitors.list()`                   | List all monitors (cached event)             |
| `monitors.add(config)`              | Add a new monitor (Zod-validated)            |
| `monitors.edit(id, changes)`        | Edit a monitor (fetches existing, merges)    |
| `monitors.delete(id)`               | Delete a monitor                             |
| `monitors.pause(id)`                | Pause monitoring                             |
| `monitors.resume(id)`               | Resume monitoring                            |
| `monitors.getBeats(id, hours)`      | Get recent heartbeats                        |
| `monitors.getStatus(id)`            | Derive status from cached heartbeats         |
| `monitors.clearEvents(id)`          | Clear all events for a monitor               |
| `monitors.clearHeartbeats(id)`      | Clear all heartbeats for a monitor           |
| `monitors.addTag(tagId, monitorId)` | Attach a tag to a monitor                    |
| `monitors.deleteTag(tagId, ...)`    | Detach a tag from a monitor                  |
| `monitors.getGameList()`            | Query supported game servers                 |
| `monitors.testChrome(executable)`   | Test Chrome/Chromium path for real-browser   |

```ts
await api.monitors.add({
  type: 'http',
  name: 'Dashboard',
  url: 'https://status.mycompany.com',
  interval: 30,
  timeout: 10,
  maxretries: 2,
  notificationIDList: [1, 3],   // notify on state changes
})
```

---

## `api.tags` — Tag CRUD

| Method                        | Description                     |
| ----------------------------- | ------------------------------- |
| `tags.list()`                 | List all tags                   |
| `tags.get(id)`                | Get a tag by ID                 |
| `tags.add({ name, color })`   | Create a tag                    |
| `tags.edit(id, changes)`      | Update a tag                    |
| `tags.delete(id)`             | Delete a tag                    |

---

## `api.notifications` — Notification providers

| Method                              | Description                               |
| ----------------------------------- | ----------------------------------------- |
| `notifications.list()`              | List notification configs (cached event)  |
| `notifications.get(id)`             | Get a notification by ID                  |
| `notifications.add(config)`         | Add a new notification provider           |
| `notifications.edit(id, changes)`   | Update a notification                     |
| `notifications.delete(id)`          | Delete a notification                     |
| `notifications.test(config)`        | Test a notification config                |
| `notifications.checkApprise()`      | Check if Apprise is available             |

---

## `api.proxies` — Proxy configurations

| Method                      | Description                      |
| --------------------------- | -------------------------------- |
| `proxies.list()`            | List proxies (cached event)      |
| `proxies.get(id)`           | Get a proxy by ID                |
| `proxies.add(config)`       | Add a proxy                      |
| `proxies.edit(id, changes)` | Update a proxy                   |
| `proxies.delete(id)`        | Delete a proxy                   |

Supported protocols: `http`, `https`, `socks`, `socks4`, `socks5`, `socks5h`

---

## `api.statusPages` — Status pages & incidents

| Method                                    | Description                       |
| ----------------------------------------- | --------------------------------- |
| `statusPages.list()`                      | List status pages (cached event)  |
| `statusPages.get(slug)`                   | Get a status page by slug         |
| `statusPages.add(slug, title)`            | Create a status page              |
| `statusPages.delete(slug)`                | Delete a status page              |
| `statusPages.save(slug, config)`          | Update status page configuration  |
| `statusPages.postIncident(slug, incident)` | Post an incident                  |
| `statusPages.unpinIncident(slug)`         | Unpin the current incident        |

---

## `api.maintenance` — Maintenance windows

| Method                                       | Description                                  |
| -------------------------------------------- | -------------------------------------------- |
| `maintenance.list()`                         | List maintenance windows (cached event)      |
| `maintenance.get(id)`                        | Get a maintenance window                     |
| `maintenance.add(config)`                    | Create a maintenance window                  |
| `maintenance.edit(id, changes)`              | Update a maintenance window                  |
| `maintenance.delete(id)`                     | Delete a maintenance window                  |
| `maintenance.pause(id)` / `resume(id)`       | Pause / resume a maintenance window          |
| `maintenance.getMonitors(id)`                | Get monitors associated with a maintenance   |
| `maintenance.addMonitors(id, monitorIds)`    | Associate monitors with a maintenance        |
| `maintenance.getStatusPages(id)`             | Get status pages associated                  |
| `maintenance.addStatusPages(id, pageIds)`    | Associate status pages                       |

Strategies: `manual`, `single`, `recurring-interval`, `recurring-weekday`, `recurring-day-of-month`, `cron`

---

## `api.dockerHosts` — Docker hosts

| Method                            | Description                           |
| --------------------------------- | ------------------------------------- |
| `dockerHosts.list()`              | List Docker hosts (cached event)      |
| `dockerHosts.get(id)`             | Get a Docker host by ID               |
| `dockerHosts.add(config)`         | Add a Docker host                     |
| `dockerHosts.edit(id, changes)`   | Update a Docker host                  |
| `dockerHosts.delete(id)`          | Delete a Docker host                  |
| `dockerHosts.test(config)`        | Test Docker host connectivity         |

---

## `api.apiKeys` — API keys

| Method                        | Description                    |
| ----------------------------- | ------------------------------ |
| `apiKeys.list()`              | List API keys (cached event)   |
| `apiKeys.get(id)`             | Get an API key by ID           |
| `apiKeys.add(input)`          | Create an API key              |
| `apiKeys.enable(id)`          | Enable an API key              |
| `apiKeys.disable(id)`         | Disable an API key             |
| `apiKeys.delete(id)`          | Delete an API key              |

---

## `api.settings` — Server settings

| Method                                   | Description                |
| ---------------------------------------- | -------------------------- |
| `settings.get()`                         | Get current settings       |
| `settings.set(changes)`                  | Update settings            |
| `settings.changePassword(old, new)`      | Change admin password      |
| `settings.uploadBackup(json, handle)`    | Restore from backup        |
| `settings.clearStatistics()`             | Reset statistics           |

---

## `api.twoFactor` — Two-factor authentication

| Method                              | Description                  |
| ----------------------------------- | ---------------------------- |
| `twoFactor.status()`                | Check 2FA status             |
| `twoFactor.prepare(password)`       | Start 2FA setup              |
| `twoFactor.verifyToken(token, pwd)` | Verify a 2FA token           |
| `twoFactor.save(password)`          | Save 2FA configuration       |
| `twoFactor.disable(password)`       | Disable 2FA                  |

---

## `api.database` — Database maintenance

| Method                   | Description              |
| ------------------------ | ------------------------ |
| `database.getSize()`     | Get database size        |
| `database.shrink()`      | Shrink the database      |

---

## Server info (on the main client)

```ts
const info = await api.info()
console.log(api.version)              // cached, synchronous

const heartbeats  = await api.getHeartbeats()
const important   = await api.getImportantHeartbeats()
const avgPing     = await api.avgPing()
const uptime      = await api.uptime()
const certInfo    = await api.certInfo()
```

---

## Setup (first-run)

```ts
if (await api.needSetup()) {
  await api.setup('admin', 'secure-password-123')
}
```
