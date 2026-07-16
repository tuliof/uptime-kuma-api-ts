# uptime-kuma-api-ts

**TypeScript SDK for [Uptime Kuma](https://github.com/louislam/uptime-kuma) v2.**  
Programmatically manage monitors, notifications, status pages, maintenance windows, and more — all over Socket.IO.

```ts
import { UptimeKumaApi } from 'uptime-kuma-api-ts'

const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
await api.connect()
await api.login('admin', 'admin123')

const { monitorID } = await api.monitors.add({
  type: 'http',
  name: 'My Website',
  url: 'https://example.com',
})
console.log('Created monitor', monitorID)

await api.disconnect()
```

📖 **More runnable examples → [`examples/`](examples/)**

---

## Features

- **🔌 Full API coverage** — monitors, notifications, proxies, status pages, maintenance, Docker hosts, API keys, settings, 2FA, database
- **📦 First-class types** — every endpoint has Zod-validated inputs and inferred response types
- **⚡ Real-time** — event caching gives you instant access to heartbeats, uptime, and live data without polling
- **♻️ Auto-reconnect** — survives network blips with transparent re-authentication
- **🔐 Auth support** — password, JWT token, auto-login, 2FA
- **✅ Works everywhere** — Node.js ≥18, Bun ≥1.3, any Socket.IO-compatible runtime

---

## Install

```bash
npm install uptime-kuma-api-ts
# or
bun add uptime-kuma-api-ts
```

---

## Quick Start

```ts
import { UptimeKumaApi } from 'uptime-kuma-api-ts'

const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
await api.connect()
await api.login('admin', 'password')

const { monitorID } = await api.monitors.add({
  type: 'http',
  name: 'My Site',
  url: 'https://example.com',
})
console.log('Monitor created:', monitorID)

await api.disconnect()
```

📖 **Full runnable examples → [`examples/`](examples/)**  — drop in your env vars and go.

---

## API Reference

All domain operations are accessed through **lazy-loaded sub-clients** on the main `UptimeKumaApi` instance. Each sub-client shares the same socket connection and exposes a clean, typed interface.

| Sub-client         | Resources                     |
| ------------------ | ----------------------------- |
| `api.monitors`     | Create, read, update, delete, pause, resume, beats, tags, status |
| `api.tags`         | CRUD for color-coded tags     |
| `api.notifications` | Notification providers (Slack, email, webhook, 90+) |
| `api.proxies`      | Proxy configurations          |
| `api.statusPages`  | Status pages & incidents      |
| `api.maintenance`  | Maintenance windows (6 strategies) |
| `api.dockerHosts`  | Docker host connections       |
| `api.apiKeys`      | API key management            |
| `api.settings`     | Server settings               |
| `api.twoFactor`    | Two-factor authentication     |
| `api.database`     | Database size & shrink        |

📖 **Full method list with argument signatures, types, and examples → [API.md](API.md)**

---

## Configuration

```ts
interface UptimeKumaApiConfig {
  url: string                          // Required: Uptime Kuma server URL
  timeout?: number                     // Socket operations timeout in ms (default: 10000)
  headers?: Record<string, string>     // Custom HTTP headers for Socket.IO handshake
  sslVerify?: boolean                  // Verify TLS certificates (default: true)
  waitEvents?: number                  // Coalesce delay for multi-message events in ms (default: 200)
  logger?: Logger                      // Pluggable logger (SilentLogger by default)
}
```

### Custom logging

```ts
import { UptimeKumaApi, ConsoleLogger, createLogger } from 'uptime-kuma-api-ts'

const api = new UptimeKumaApi({
  url: 'http://localhost:3001',
  logger: createLogger('info'),        // logs info/warn/error to console
  // or: new ConsoleLogger('debug')
})
```

---

## Error Handling

All SDK errors extend `UptimeKumaError`, so you can catch them with a single type guard:

```ts
import { UptimeKumaError, ConnectionError, AuthenticationError, Timeout } from 'uptime-kuma-api-ts'

try {
  await api.connect()
  await api.login('wrong', 'credentials')
} catch (err) {
  if (err instanceof AuthenticationError) {
    console.error('Bad credentials:', err.message)
  } else if (err instanceof ConnectionError) {
    console.error('Server unreachable:', err.message)
  } else if (err instanceof Timeout) {
    console.error('Request timed out')
  } else if (err instanceof UptimeKumaError) {
    console.error('API error:', err.message)
  }
}
```

Each error has a `code` property:
| Error               | Code                   |
| ------------------- | ---------------------- |
| `Timeout`           | `TIMEOUT`              |
| `ConnectionError`   | `CONNECTION_ERROR`     |
| `AuthenticationError` | `AUTHENTICATION_ERROR` |

---

## TypeScript & Zod Schemas

All domain types are defined as **Zod schemas** — giving you runtime validation and compile-time type inference from a single source of truth.

```ts
import { MonitorConfigSchema, type MonitorConfig } from 'uptime-kuma-api-ts'

// Runtime validation with clear error messages
const config: MonitorConfig = MonitorConfigSchema.parse({
  type: 'http', name: 'My Site', url: 'https://example.com',
})

// The inferred type is available for direct use too
const monitor: Monitor = await api.monitors.get(1)
```

📖 **Full list of available schemas and types → [API.md](API.md)**

---

## Examples

Ready-to-run TypeScript files in [`examples/`](examples/):

| File | What it shows |
|------|---------------|
| [`quick-start.ts`](examples/quick-start.ts) | Connect, login, CRUD, disconnect |
| [`health-check.ts`](examples/health-check.ts) | Monitor creation, tagging, heartbeat status |
| [`maintenance-window.ts`](examples/maintenance-window.ts) | Maintenance scheduling, bulk pause, graceful shutdown |

```bash
# Set your Uptime Kuma credentials and run any example
KUMA_URL=http://localhost:3001 KUMA_USER=admin KUMA_PASS=secret123 \
  bun run examples/quick-start.ts
```

---

## Development

### Setup

```bash
git clone https://github.com/tuliof/uptime-kuma-api-ts.git
cd uptime-kuma-api-ts
bun install
```

> **Note:** Integration tests require [Docker](https://docker.com) to spin up a real Uptime Kuma instance via testcontainers.

### Commands

| Command                    | Description                                   |
| -------------------------- | --------------------------------------------- |
| `bun run check`            | Type-check + lint                             |
| `bun run lint:fix`         | Auto-fix formatting and lint                  |
| `bun run build`            | Build ESM bundle + type declarations          |
| `bun run test:unit`        | Run unit tests (fast, no Docker)              |
| `bun run test:integration` | Run integration tests (requires Docker)       |
| `bun run full-check`       | Lint → build → unit → integration             |
| `bun run kuma:start`       | Start local Uptime Kuma instance via Compose  |
| `bun run kuma:stop`        | Stop and clean up the local instance          |

### Project structure

```
src/
├── index.ts            # Public exports
├── client.ts           # UptimeKumaApi — connection, auth, sub-client getters
├── socket.ts           # SocketWrapper — emitWithAck, event caching, deferred-resolution
├── errors.ts           # Error hierarchy (4 types)
├── logger.ts           # Pluggable logger
├── utils.ts            # Pure helper functions (intToBool, parseValue, genSecret, …)
├── types/              # Zod schemas + inferred types (one file per domain)
├── api/                # Sub-client implementations (one file per domain)
```

### Architecture

- **Sub-client pattern**: `UptimeKumaApi` handles connection/auth. Domain logic lives in 11 sub-clients (`monitors`, `tags`, `notifications`, …), accessed via lazy getters.
- **Event caching**: Socket.IO events like `monitorList`, `heartbeatList`, `notificationList` are cached in `SocketWrapper`. Reads use a deferred-resolver pattern — no polling.
- **Pure transforms**: Utility functions (`intToBool`, `parseValue`, `convertMonitorNotificationIds`) are pure — they return new objects instead of mutating inputs.

---

## Compatibility

| Runtime   | Version    |
| --------- | ---------- |
| Node.js   | ≥ 18.0.0   |
| Bun       | ≥ 1.3.0    |
| Uptime Kuma | v2.x    |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgments

Inspired by the [uptime-kuma-api](https://github.com/lucasheld/uptime-kuma-api) Python wrapper.  

Built for the Uptime Kuma community 🐻
