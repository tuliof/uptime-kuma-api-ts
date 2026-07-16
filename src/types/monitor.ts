import { z } from 'zod'

/**
 * Monitor types supported by Uptime Kuma v2.
 */
export const MonitorTypeSchema = z.enum([
  'group',
  'http',
  'port',
  'ping',
  'keyword',
  'grpc-keyword',
  'json-query',
  'dns',
  'docker',
  'real-browser',
  'push',
  'steam',
  'gamedig',
  'mqtt',
  'kafka-producer',
  'sqlserver',
  'postgres',
  'mysql',
  'mongodb',
  'radius',
  'redis',
  'tailscale-ping',
])

export type MonitorType = z.infer<typeof MonitorTypeSchema>

/**
 * Monitor heartbeat status values.
 *
 * - `up`: Monitor is responding successfully
 * - `down`: Monitor failed its last check
 * - `pending`: No heartbeats recorded yet
 * - `maintenance`: Monitor is paused or in maintenance mode
 */
export const MonitorStatusSchema = z.enum(['down', 'up', 'pending', 'maintenance'])

export type MonitorStatus = z.infer<typeof MonitorStatusSchema>

/** Numeric status code to label mapping (from Uptime Kuma's internal representation). */
export const STATUS_CODE_MAP: Readonly<Record<number, MonitorStatus>> = {
  0: 'down',
  1: 'up',
  2: 'pending',
  3: 'maintenance',
} as const

/**
 * Monitor configuration schema for add/edit operations.
 *
 * All accepted monitor fields are present here regardless of type.
 * Irrelevant fields are silently ignored by the server per monitor type.
 * Fields with `.default()` are optional at input time.
 */
export const MonitorConfigSchema = z.object({
  /** Monitor type — determines which checks are performed. @default 'http' */
  type: MonitorTypeSchema,

  /** Human-readable label for this monitor. Must be unique per server. */
  name: z.string(),

  /**
   * How often to run the check, in **seconds**.
   * @minimum 20
   * @default 60
   */
  interval: z.number().min(20).default(60),

  /**
   * How long to wait (in seconds) before retrying a failed check.
   * @minimum 20
   * @default 60
   */
  retryInterval: z.number().min(20).default(60),

  /**
   * How often (in seconds) to resend the notification if the monitor
   * stays down. 0 = only notify once on state change.
   * @minimum 0
   * @default 0
   */
  resendInterval: z.number().min(0).default(0),

  /**
   * Number of consecutive failures before the monitor is marked as `down`.
   * @minimum 0
   * @default 1
   */
  maxretries: z.number().min(0).default(1),

  /**
   * When `true`, invert the success/failure logic — the monitor is `up`
   * when the check fails and `down` when it succeeds.
   * @default false
   */
  upsideDown: z.boolean().default(false),

  /**
   * IDs of notifications to trigger on state change.
   * Passed as an array of numbers. The API converts to `{ id: true }` format internally.
   * @default []
   */
  notificationIDList: z.array(z.number()).default([]),

  /**
   * HTTP request body encoding.
   * @default 'json'
   */
  httpBodyEncoding: z.enum(['json', 'xml']).default('json'),

  /**
   * Parent monitor ID for grouping.
   * Set when `type: 'group'` to assign child monitors.
   */
  parent: z.number().nullable().optional(),

  /** Free-text description of the monitor's purpose. */
  description: z.string().nullable().optional(),

  /**
   * Keyword / JSON query — search conditions.
   * Each condition is a key/value pair, e.g. `{ type: 'contains', value: 'OK' }`.
   * @default []
   */
  conditions: z.array(z.record(z.string(), z.unknown())).default([]),

  /**
   * URL to check. Required for: `http`, `keyword`, `json-query`, `real-browser`.
   * Example: `https://example.com/health`
   */
  url: z.string().nullable().optional(),

  /**
   * Maximum number of HTTP redirects to follow.
   * Used by: `http`, `keyword`, `grpc-keyword`
   * @minimum 0
   * @default 10
   */
  maxredirects: z.number().min(0).default(10),

  /**
   * Accepted HTTP status codes (or ranges) for a successful check.
   * Example: `['200-299', '301', '302']`
   * @default ['200-299']
   */
  accepted_statuscodes: z.array(z.string()).default(['200-299']),

  /**
   * Send notification when the monitor's SSL/TLS certificate is
   * close to expiry. Used by: `http`, `keyword`, `json-query`
   * @default false
   */
  expiryNotification: z.boolean().default(false),

  /**
   * Skip TLS certificate validation. Useful for self-signed certs.
   * Used by: `http`, `keyword`, `json-query`
   * @default false
   */
  ignoreTls: z.boolean().default(false),

  /**
   * ID of the proxy configuration to route requests through.
   * `null` = direct connection (no proxy).
   */
  proxyId: z.number().nullable().optional(),

  /**
   * HTTP request method.
   * @default 'GET'
   */
  method: z.string().default('GET'),

  /**
   * HTTP request body (plain text, JSON, XML, etc.).
   * Only relevant for POST/PUT/PATCH requests.
   */
  body: z.string().nullable().optional(),

  /**
   * Custom HTTP headers as a JSON string.
   * Example: `'{"Authorization": "Bearer token123"}'`
   */
  headers: z.string().nullable().optional(),

  /**
   * Authentication method for HTTP requests.
   * See `AuthMethod` enum for supported values.
   * @default '' (no auth)
   */
  authMethod: z.string().default(''),

  /**
   * Request timeout in **seconds**.
   * @default 48
   */
  timeout: z.number().default(48),

  // --- Mutual TLS (mTLS) ---

  /** TLS client certificate (PEM format). Used when `authMethod: 'mtls'`. */
  tlsCert: z.string().nullable().optional(),
  /** TLS client private key (PEM format). Used when `authMethod: 'mtls'`. */
  tlsKey: z.string().nullable().optional(),
  /** TLS CA certificate (PEM format) for custom certificate authorities. */
  tlsCa: z.string().nullable().optional(),

  // --- HTTP Basic / NTLM auth ---

  /** Username for HTTP Basic or NTLM authentication. */
  basic_auth_user: z.string().nullable().optional(),
  /** Password for HTTP Basic or NTLM authentication. */
  basic_auth_pass: z.string().nullable().optional(),
  /** NTLM authentication domain. */
  authDomain: z.string().nullable().optional(),
  /** NTLM authentication workstation name. */
  authWorkstation: z.string().nullable().optional(),

  // --- OAuth2 Client Credentials ---

  /**
   * OAuth2 token endpoint authentication method.
   * @default 'client_secret_basic'
   */
  oauth_auth_method: z.string().default('client_secret_basic'),
  /** OAuth2 token endpoint URL. */
  oauth_token_url: z.string().nullable().optional(),
  /** OAuth2 client ID. */
  oauth_client_id: z.string().nullable().optional(),
  /** OAuth2 client secret. */
  oauth_client_secret: z.string().nullable().optional(),
  /** OAuth2 scopes (space-separated). */
  oauth_scopes: z.string().nullable().optional(),

  // --- Keyword monitoring ---

  /** Keyword to search for in the response body (`type: 'keyword'`). */
  keyword: z.string().nullable().optional(),
  /**
   * When `true`, the monitor is `up` if the keyword is **absent**.
   * @default false
   */
  invertKeyword: z.boolean().default(false),

  // --- gRPC Keyword ---

  /** gRPC server URL. Used when `type: 'grpc-keyword'`. */
  grpcUrl: z.string().nullable().optional(),
  /** Enable TLS for gRPC connection. @default false */
  grpcEnableTls: z.boolean().default(false),
  /** gRPC service name to call. */
  grpcServiceName: z.string().nullable().optional(),
  /** gRPC method name to call. */
  grpcMethod: z.string().nullable().optional(),
  /** gRPC protobuf definition (reflection or descriptor). */
  grpcProtobuf: z.string().nullable().optional(),
  /** gRPC request body (protobuf wire format as string). */
  grpcBody: z.string().nullable().optional(),
  /** gRPC metadata as a JSON string (e.g. `'{"key": "value"}'`). */
  grpcMetadata: z.string().nullable().optional(),

  /**
   * Hostname to check. Used by: `port`, `ping`, `dns`, `steam`,
   * `mqtt`, `radius`, `tailscale-ping`.
   */
  hostname: z.string().nullable().optional(),

  /**
   * ICMP packet size in bytes (`type: 'ping'`).
   * @default 56
   */
  packetSize: z.number().default(56),

  /**
   * Port number. Used by: `port`, `dns` (default 53), `steam`, `mqtt`, `radius` (default 1812).
   * @minimum 0 @maximum 65535
   */
  port: z.number().min(0).max(65535).nullable().optional(),

  /**
   * DNS resolver to query (`type: 'dns'`).
   * @default '1.1.1.1'
   */
  dns_resolve_server: z.string().default('1.1.1.1'),
  /**
   * DNS record type to resolve (`type: 'dns'`).
   * @default 'A'
   */
  dns_resolve_type: z.string().default('A'),

  // --- MQTT ---

  /** MQTT username. @default '' */
  mqttUsername: z.string().default(''),
  /** MQTT password. @default '' */
  mqttPassword: z.string().default(''),
  /** MQTT topic to subscribe to. @default '' */
  mqttTopic: z.string().default(''),
  /** Expected MQTT message content on the topic. @default '' */
  mqttSuccessMessage: z.string().default(''),

  /**
   * Database connection string (JDBC format).
   * Used by: `sqlserver`, `postgres`, `mysql`, `mongodb`, `redis`.
   * Example: `Server=host,1433;Database=myapp;...`
   */
  databaseConnectionString: z.string().nullable().optional(),

  /**
   * SQL query to execute against the database.
   * Used by: `sqlserver`, `postgres`, `mysql`.
   * Must return at least one row for the check to pass.
   */
  databaseQuery: z.string().nullable().optional(),

  // --- Docker ---

  /** Container name or ID to monitor (`type: 'docker'`). @default '' */
  docker_container: z.string().default(''),
  /** Docker host ID (references `dockerHosts.list()`). */
  docker_host: z.number().nullable().optional(),

  // --- RADIUS ---

  /** RADIUS authenticator username. */
  radiusUsername: z.string().nullable().optional(),
  /** RADIUS authenticator password. */
  radiusPassword: z.string().nullable().optional(),
  /** RADIUS shared secret. */
  radiusSecret: z.string().nullable().optional(),
  /** RADIUS Called-Station-Id attribute. */
  radiusCalledStationId: z.string().nullable().optional(),
  /** RADIUS Calling-Station-Id attribute. */
  radiusCallingStationId: z.string().nullable().optional(),

  // --- GameDig ---

  /**
   * Game identifier for GameDig query (`type: 'gamedig'`).
   * See: https://github.com/gamedig/node-gamedig#games-list
   */
  game: z.string().nullable().optional(),
  /**
   * Only query the given port, skip port scanning.
   * @default true
   */
  gamedigGivenPortOnly: z.boolean().default(true),

  // --- JSON Query ---

  /** JSONPath expression to evaluate (`type: 'json-query'`). */
  jsonPath: z.string().nullable().optional(),
  /** Expected value at the evaluated JSONPath. */
  expectedValue: z.string().nullable().optional(),

  // --- Kafka Producer ---

  /**
   * Kafka bootstrap brokers (`type: 'kafka-producer'`).
   * Example: `['broker1:9092', 'broker2:9092']`
   * @default []
   */
  kafkaProducerBrokers: z.array(z.string()).default([]),
  /** Kafka topic to produce a test message to. */
  kafkaProducerTopic: z.string().nullable().optional(),
  /** Kafka message content. */
  kafkaProducerMessage: z.string().nullable().optional(),
  /** Enable TLS for Kafka connection. @default false */
  kafkaProducerSsl: z.boolean().default(false),
  /** Allow auto-creation of the Kafka topic. @default false */
  kafkaProducerAllowAutoTopicCreation: z.boolean().default(false),
  /**
   * Kafka SASL authentication options.
   * @default { mechanism: 'None' }
   */
  kafkaProducerSaslOptions: z
    .object({
      mechanism: z.enum(['None', 'plain', 'scram-sha-256', 'scram-sha-512', 'aws']),
    })
    .default({ mechanism: 'None' }),

  /**
   * Push monitor token (`type: 'push'`).
   * Auto-generated with `genSecret(10)` if not provided.
   */
  pushToken: z.string().nullable().optional(),
})

export type MonitorConfig = z.infer<typeof MonitorConfigSchema>

/** Monitor record as returned by the API (includes id and computed fields). */
export const MonitorSchema = MonitorConfigSchema.extend({
  /** Unique monitor identifier. */
  id: z.number(),
  /** URL path name for push monitors. */
  pathName: z.string().optional(),
  /** Whether the monitor is currently active (not paused). */
  active: z.boolean().optional(),
  /** Tags attached to this monitor. */
  tags: z
    .array(
      z.object({
        /** Tag ID. */
        tag_id: z.number(),
        /** Monitor ID this tag is attached to. */
        monitor_id: z.number(),
        /** Optional tag value (e.g. `'critical'`). */
        value: z.string(),
      }),
    )
    .optional(),
})

export type Monitor = z.infer<typeof MonitorSchema>

/** Input schema for adding a monitor. Accepts partial config — defaults fill the rest. */
export const AddMonitorInputSchema = MonitorConfigSchema

export type AddMonitorInput = z.input<typeof AddMonitorInputSchema>

/** A tag definition (name + color). */
export const TagSchema = z.object({
  /** Unique tag identifier. */
  id: z.number(),
  /** Tag display name. */
  name: z.string(),
  /** Hex color code (e.g. `'#ff0000'`). */
  color: z.string(),
})

export type Tag = z.infer<typeof TagSchema>

/** Input for adding a tag. */
export const AddTagInputSchema = z.object({
  /** Tag display name. Must not be empty. */
  name: z.string().min(1),
  /** Hex color code (e.g. `'#ff0000'`). Must not be empty. */
  color: z.string().min(1),
})

export type AddTagInput = z.infer<typeof AddTagInputSchema>

/** Input for editing a tag (all fields optional — only provided fields are updated). */
export const EditTagInputSchema = z.object({
  /** New display name. */
  name: z.string().min(1).optional(),
  /** New hex color code. */
  color: z.string().min(1).optional(),
})

export type EditTagInput = z.infer<typeof EditTagInputSchema>

/** Input schema for editing a monitor (requires id, all other fields optional). */
export const EditMonitorInputSchema = z.object({
  /** Monitor ID to edit. */
  id: z.number(),
})

export type EditMonitorInput = z.infer<typeof EditMonitorInputSchema> & Partial<MonitorConfig>

/** Heartbeat record from `getMonitorBeats` / `heartbeatList` events. */
export const HeartbeatSchema = z.object({
  /** Heartbeat identifier. */
  id: z.number(),
  /** Monitor this heartbeat belongs to. */
  monitor_id: z.number(),
  /**
   * Numeric status code:
   * - 0 = down
   * - 1 = up
   * - 2 = pending
   * - 3 = maintenance
   */
  status: z.number(),
  /** ISO timestamp of the heartbeat. */
  time: z.string(),
  /** Status message (e.g. error details when down). */
  msg: z.string().nullable(),
  /** Response time in milliseconds, or `null` if unavailable. */
  ping: z.number().nullable(),
  /** Whether this is an important (state-change) heartbeat. */
  important: z.boolean(),
  /** Response duration in milliseconds. */
  duration: z.number(),
  /** Number of retries before this heartbeat was recorded. */
  retries: z.number().optional(),
  /** Consecutive down-count at the time of this heartbeat. */
  down_count: z.number().optional(),
})

export type Heartbeat = z.infer<typeof HeartbeatSchema>
