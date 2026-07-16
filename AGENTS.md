## Engineering principles (follow by default)

Optimize for: correctness, simplicity, safe change, and operability. Prefer boring code.
Preserve existing behavior unless the task explicitly changes it.

### Build only what is needed (YAGNI)
- Do not add speculative features, flags, abstractions, or “future-proof” layers.
- Introduce new abstractions only when there are multiple real callers or a proven reuse case.

### Keep it simple (KISS)
- Prefer the simplest solution that is readable and maintainable.
- Avoid cleverness, unnecessary patterns, and over-parameterization.

### Reduce duplication thoughtfully (DRY, not “abstract everything”)
- Avoid duplicated business rules and data mappings.
- Accept small, local duplication if abstraction would be leaky or premature.

### Make illegal states unrepresentable
- Use types, enums, constructors/factories, and validation to prevent invalid state.
- Validate at boundaries (API input, DB reads, message handlers). Keep internals clean.
- Prefer explicit domain types over raw primitives when it prevents mistakes.

### Fail fast (with good errors)
- Detect invalid inputs and impossible states early (guard clauses, assertions).
- Prefer early `return`/`throw` over deeply nested conditionals.
- Rule: no `else` after `return` / `throw` / `continue` / `break`.

### Separation of concerns + loose coupling + high cohesion
- Keep modules focused: parsing/IO, domain logic, and persistence should not be mixed.
- Minimize public surface area. Expose small, stable interfaces.
- Avoid hidden coupling via globals, singletons, or implicit environment reads.
- Dependencies should be injected or passed explicitly where practical.

### Testing: TDD where it fits; always test behavior
- Prefer TDD (red → green → refactor) for non-trivial logic and bug fixes.
- Write tests against observable behavior (public API, outputs, side effects),
  not private methods or implementation details.
- Keep tests deterministic and fast. Use integration tests for boundaries.
- When fixing a bug: add a failing test first, then fix, then refactor.

### Design for observability (production is the real runtime)
- Add/maintain:
  - structured logs (no secrets/PII),
  - metrics for key outcomes and failure modes,
  - tracing/correlation IDs across boundaries.
- Log at boundaries (requests, jobs, external calls), not inside tight loops.
- Include enough context to debug: operation, identifiers (non-sensitive), timings,
  and error causes.

### Change safety
- Make the smallest change that solves the task.
- Keep PRs small and reviewable; refactor separately when possible.
- Maintain backward compatibility for public APIs unless explicitly allowed.

### Output expectations (when you modify code)
- Explain key design choices and tradeoffs briefly.
- List any assumptions and any follow-up work you did not do (with reasons).
- If requirements are unclear or risky, ask before implementing.

## Bun native features (prefer over external packages)

This project runs on Bun. Before reaching for an npm package, check if Bun has a
built-in equivalent. **Do not assume how Bun's API works** — consult the Bun docs
at <https://bun.com/docs/llms.txt> (or the MCP tools) to verify API signatures,
options, and behavior.

| Need | Use (Bun native) | Avoid (external) |
|------|------------------|------------------|
| Test runner | `bun:test` (`describe`, `test`, `expect`, `mock`, etc.) | jest, vitest, mocha |
| File I/O | `Bun.file()`, `Bun.write()` | fs-extra |
| HTTP client | `fetch()` (Web standard, Bun-optimized) | axios, got, node-fetch |
| Semver | `Bun.semver` | semver, parse-semver |
| Glob matching | `Bun.Glob` | glob, fast-glob |
| Shell commands | `Bun.spawn()`, `Bun.spawnSync()`, `Bun.$` | execa, shelljs |
| Path utilities | `import.meta.dir`, `import.meta.path`, `import.meta.main` | (complements node:path) |
| Environment vars | `Bun.env`, auto-loaded `.env` | dotenv |
| Code coverage | `bunfig.toml` `[test]` coverage config | c8, nyc |
| Hashing | `Bun.hash`, `Bun.passwordHash` | bcrypt, argon2 |
| Base64/encoding | `Bun.base64Encode`, `Bun.base64Decode` | (manual Buffer ops) |
| Crypto UUID | `crypto.randomUUID()` (Web standard) | uuid |
| TOML/YAML/JSON5 | Bun's built-in loaders (`Bun.TOML`, etc.) | toml/yaml parsers |

**Exceptions (no Bun-native alternative exists):**
- `socket.io-client` — Uptime Kuma uses the Socket.IO protocol; no native client.
- `zod` — runtime schema validation + type inference; no native equivalent.
- `testcontainers` — Docker lifecycle for integration tests; no native equivalent.

When in doubt, check the docs first. A wrong assumption about Bun's API is worse
than the 30 seconds it takes to verify.

## Architecture

### Project Layout

```
src/
├── index.ts            # Public exports (types, classes, schemas)
├── client.ts           # UptimeKumaApi: socket lifecycle, auth, sub-client getters
├── socket.ts           # Socket.IO wrapper: emitWithAck, event caching, waitForEvent
├── logger.ts           # Logger interface: SilentLogger, ConsoleLogger, createLogger
├── errors.ts           # UptimeKumaError, Timeout, ConnectionError, AuthenticationError
├── utils.ts            # intToBool, parseValue, transformPayload helpers
├── types/              # Zod schemas + inferred types + enums (one file per domain)
│   ├── index.ts
│   ├── monitor.ts      # MonitorType (22), MonitorStatus (4), MonitorConfig
│   ├── auth.ts         # AuthMethod (5)
│   ├── notification.ts # NotificationType, provider options/conditions
│   ├── proxy.ts        # ProxyProtocol (6)
│   ├── status-page.ts  # IncidentStyle (6)
│   ├── docker.ts       # DockerType (2)
│   ├── maintenance.ts  # MaintenanceStrategy (6)
│   ├── event.ts        # 18 socket event names
│   └── settings.ts     # Settings schema
└── api/                # Sub-client implementations (one file per domain)
    ├── monitors.ts     # MonitorsClient: CRUD, pause/resume, beats, tags, clear
    ├── tags.ts         # TagsClient: CRUD
    ├── notifications.ts # NotificationsClient: CRUD, test, checkApprise
    ├── proxies.ts      # ProxiesClient: CRUD
    ├── status-pages.ts # StatusPagesClient: CRUD, save, incidents (socket + REST)
    ├── maintenance.ts  # MaintenanceClient: CRUD, pause/resume, monitor/page assoc
    ├── docker-hosts.ts # DockerHostsClient: CRUD, test
    ├── api-keys.ts     # ApiKeysClient: CRUD, enable/disable
    ├── settings.ts     # SettingsClient: get/set, changePassword, uploadBackup
    ├── two-factor.ts   # TwoFactorClient: status, prepare, verify, save, disable
    └── database.ts     # DatabaseClient: getSize, shrink
tests/
├── helpers.ts          # setupUptimeKuma, waitForUptimeKuma, cleanup helpers
├── integration.test.ts # Testcontainers-based integration tests
└── unit/               # Unit tests for schemas, utils, transforms
```

### Sub-Client Pattern

The main `UptimeKumaApi` class handles connection, authentication, and event
caching. Domain operations are delegated to sub-clients, accessed via lazy
getters:

```typescript
const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
await api.connect()
await api.login('admin', 'admin123')

// Sub-clients are lazy-initialized and share the same socket
api.monitors.add({ type: 'http', name: 'Google', url: 'https://google.com' })
api.notifications.list()
api.maintenance.add({ title: 'Maintenance', strategy: 'manual' })
```

### Adding a New API Method — Recipe

1. **Schema** (`src/types/<domain>.ts`): Define Zod input schema + inferred type.
2. **Sub-client** (`src/api/<domain>.ts`): Add method using `socket.emitWithAck()`
   or event-cached reads. Validate input with the schema.
3. **Main client** (`src/client.ts`): Expose via sub-client getter (already done
   if the sub-client exists).
4. **Export** (`src/index.ts`): Export new types/schemas.
5. **Tests**: Unit test for schema validation; integration test for the socket flow.

### Naming Conventions

- **Method names**: camelCase (`getMonitor`, `addMonitor`, `editMonitor`).
- **Socket events**: match Uptime Kuma's event names exactly (`getMonitor`, `add`,
  `editMonitor`, `deleteMonitor`, etc.).
- **Sub-client getters**: plural domain noun (`monitors`, `notifications`, `tags`).

### Build & Verify Commands

```bash
bun run check        # tsc --noEmit && biome check .
bun run test:unit    # unit tests (fast, no Docker)
bun run test:integration # integration tests (requires Docker)
bun run lint:fix     # auto-fix formatting + lint
bun run build        # bun build + tsc declaration files
bun run full-check   # lint + build + test:unit + test:integration
bun run kuma:start   # docker compose up + setup credentials
bun run kuma:stop    # docker compose down --volumes
```

### Uptime Kuma Test Instance

- Start: `bun run kuma:start` (docker compose + credentials setup)
- Stop: `bun run kuma:stop` (with volumes cleanup for fresh state)
- Credentials: `.env` has `UPTIME_KUMA_URL`, `UPTIME_KUMA_USERNAME`, `UPTIME_KUMA_PASSWORD`
- Integration tests use testcontainers (auto-start/stop per suite)

