import { io, type Socket } from 'socket.io-client'

import { ApiKeysClient } from './api/api-keys'
import { DatabaseClient } from './api/database'
import { DockerHostsClient } from './api/docker-hosts'
import { MaintenanceClient } from './api/maintenance'
import { MonitorsClient } from './api/monitors'
import { NotificationsClient } from './api/notifications'
import { ProxiesClient } from './api/proxies'
import { SettingsClient } from './api/settings'
import { StatusPagesClient } from './api/status-pages'
import { TagsClient } from './api/tags'
import { TwoFactorClient } from './api/two-factor'
import { AuthenticationError, ConnectionError, UptimeKumaError } from './errors'
import type { Logger } from './logger'
import { SilentLogger } from './logger'
import { SocketWrapper } from './socket'
import { Event } from './types/event'

export interface UptimeKumaApiConfig {
  url: string
  timeout?: number
  headers?: Record<string, string>
  sslVerify?: boolean
  waitEvents?: number
  logger?: Logger
}

interface LoginResponse {
  ok: boolean
  token?: string
  msg?: string
}

interface BaseResponse {
  ok: boolean
  msg?: string
}

/**
 * Main client for interacting with Uptime Kuma v2 via Socket.IO.
 *
 * Handles connection, authentication, and event caching.
 * Domain operations are delegated to sub-clients accessed via lazy getters.
 *
 * @example
 * ```typescript
 * const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
 * await api.connect()
 * await api.login('admin', 'admin123')
 *
 * // Sub-clients are lazy-initialized and share the same socket
 * await api.monitors.add({ type: 'http', name: 'Google', url: 'https://google.com' })
 * const monitors = await api.monitors.list()
 *
 * await api.disconnect()
 * ```
 */
export class UptimeKumaApi {
  private socket: Socket | null = null
  private wrapper: SocketWrapper | null = null
  private readonly config: Required<Omit<UptimeKumaApiConfig, 'logger' | 'headers' | 'sslVerify'>>
  private readonly headers: Record<string, string> | undefined
  private readonly sslVerify: boolean
  private readonly logger: Logger
  private authenticated = false

  /** Stored login params for reconnect re-authentication. */
  private loginCredentials?: {
    username?: string
    password?: string
    token: string
  }

  // Lazy sub-client instances
  private _monitors?: MonitorsClient
  private _tags?: TagsClient
  private _notifications?: NotificationsClient
  private _proxies?: ProxiesClient
  private _statusPages?: StatusPagesClient
  private _maintenance?: MaintenanceClient
  private _dockerHosts?: DockerHostsClient
  private _apiKeys?: ApiKeysClient
  private _settings?: SettingsClient
  private _twoFactor?: TwoFactorClient
  private _database?: DatabaseClient

  constructor(config: UptimeKumaApiConfig) {
    this.config = {
      url: config.url.replace(/\/$/, ''),
      timeout: config.timeout ?? 10000,
      waitEvents: config.waitEvents ?? 200,
    }
    this.headers = config.headers
    this.sslVerify = config.sslVerify ?? true
    this.logger = config.logger ?? new SilentLogger()
  }

  // --- Connection ---

  async connect(): Promise<void> {
    // Already connected
    if (this.socket?.connected) return

    // Socket exists but disconnected — wait for auto-reconnect
    if (this.socket && !this.socket.connected) {
      return this.waitForReconnect()
    }

    // First-time connection
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        transports: ['websocket'],
      })

      this.socket.on('connect', () => {
        this.wrapper = new SocketWrapper(this.socket!, this.config.timeout)
        this.logger.info('Connected to Uptime Kuma', { url: this.config.url })
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        reject(new ConnectionError(`Connection failed: ${error.message}`))
      })

      this.socket.on('disconnect', (reason) => {
        this.authenticated = false
        this.wrapper?.clearEventData()
        this.logger.info('Disconnected from Uptime Kuma', { reason })
      })
    })
  }

  /**
   * Wait for the existing socket to finish reconnecting and re-authenticate
   * if credentials were previously stored.
   */
  private async waitForReconnect(): Promise<void> {
    // Already connected and authenticated — nothing to do
    if (this.socket?.connected && this.authenticated) return

    // Wait for the 'connect' event (Socket.IO auto-reconnect fires it)
    await new Promise<void>((resolve, reject) => {
      if (this.socket?.connected) return resolve()

      const timeout = setTimeout(() => {
        this.socket?.off('connect', onConnect)
        reject(new ConnectionError('Reconnection timed out'))
      }, this.config.timeout)

      const onConnect = () => {
        clearTimeout(timeout)
        resolve()
      }

      this.socket?.on('connect', onConnect)
    })

    // Re-authenticate if we have stored credentials
    if (this.loginCredentials && !this.authenticated) {
      const { username, password, token } = this.loginCredentials
      const res = await this.wrapper!.emitWithAck<LoginResponse>('login', {
        username,
        password,
        token,
      })
      if (!res.ok) {
        throw new AuthenticationError(`Re-authentication failed: ${res.msg ?? 'Unknown error'}`)
      }
      this.authenticated = true
      this.logger.info('Re-authenticated after reconnect')
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.removeAllListeners('connect')
      this.socket.removeAllListeners('connect_error')
      this.socket.removeAllListeners('disconnect')
      this.socket.disconnect()
      this.socket = null
      this.wrapper = null
      this.authenticated = false
    }
  }

  /** Check whether the client is currently connected. */
  isConnected(): boolean {
    return this.socket?.connected === true && this.wrapper !== null
  }

  // --- Authentication ---

  async login(
    username?: string,
    password?: string,
    token: string = '',
  ): Promise<{ token: string }> {
    this.ensureConnected()

    // Auto-login path: no credentials provided
    if (!username && !password) {
      await this.wrapper!.waitForEvent(Event.AUTO_LOGIN)
      this.authenticated = true
      return { token: '' }
    }

    this.loginCredentials = { username, password, token }

    const res = await this.wrapper!.emitWithAck<LoginResponse>('login', {
      username,
      password,
      token,
    })

    if (!res.ok) {
      throw new AuthenticationError(`Login failed: ${res.msg ?? 'Unknown error'}`)
    }

    this.authenticated = true
    return { token: res.token ?? '' }
  }

  async loginByToken(token: string): Promise<void> {
    this.ensureConnected()
    const res = await this.wrapper!.emitWithAck<LoginResponse>('loginByToken', token)
    if (!res.ok) {
      throw new AuthenticationError(`Token login failed: ${res.msg ?? 'Unknown error'}`)
    }
    this.authenticated = true
  }

  async logout(): Promise<void> {
    this.ensureConnected()
    await this.wrapper!.emitWithAck('logout')
    this.authenticated = false
  }

  // --- Setup ---

  async needSetup(): Promise<boolean> {
    this.ensureConnected()
    return this.wrapper!.emitWithAck<boolean>('needSetup')
  }

  async setup(username: string, password: string): Promise<{ msg: string }> {
    this.ensureConnected()
    const res = await this.wrapper!.emitWithAck<BaseResponse>('setup', username, password)
    if (!res.ok) {
      throw new UptimeKumaError(`Setup failed: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Setup completed.' }
  }

  // --- Server info & cached event data ---

  async info(): Promise<Record<string, unknown>> {
    this.ensureConnected()
    return this.wrapper!.getEventData(Event.INFO)
  }

  get version(): string {
    const info = this.wrapper?.getCachedEventData(Event.INFO)
    if (!info || typeof info !== 'object') {
      throw new UptimeKumaError('Server info not available. Call info() first.')
    }
    return (info as Record<string, unknown>).version as string
  }

  async getHeartbeats(): Promise<Record<number, unknown[]>> {
    this.ensureConnected()
    return this.wrapper!.getEventData(Event.HEARTBEAT_LIST)
  }

  async getImportantHeartbeats(): Promise<Record<number, unknown[]>> {
    this.ensureConnected()
    return this.wrapper!.getEventData(Event.IMPORTANT_HEARTBEAT_LIST)
  }

  async avgPing(): Promise<Record<number, unknown>> {
    this.ensureConnected()
    return this.wrapper!.getEventData(Event.AVG_PING)
  }

  async certInfo(): Promise<Record<number, unknown>> {
    this.ensureConnected()
    return this.wrapper!.getEventData(Event.CERT_INFO)
  }

  async uptime(): Promise<Record<number, Record<string, unknown>>> {
    this.ensureConnected()
    return this.wrapper!.getEventData(Event.UPTIME)
  }

  // --- Sub-client getters (lazy initialization) ---

  get monitors(): MonitorsClient {
    this.ensureAuthenticated()
    if (!this._monitors) {
      this._monitors = new MonitorsClient(this.wrapper!)
    }
    return this._monitors
  }

  get tags(): TagsClient {
    this.ensureAuthenticated()
    if (!this._tags) {
      this._tags = new TagsClient(this.wrapper!)
    }
    return this._tags
  }

  get notifications(): NotificationsClient {
    this.ensureAuthenticated()
    if (!this._notifications) {
      this._notifications = new NotificationsClient(this.wrapper!)
    }
    return this._notifications
  }

  get proxies(): ProxiesClient {
    this.ensureAuthenticated()
    if (!this._proxies) {
      this._proxies = new ProxiesClient(this.wrapper!)
    }
    return this._proxies
  }

  get statusPages(): StatusPagesClient {
    this.ensureAuthenticated()
    if (!this._statusPages) {
      this._statusPages = new StatusPagesClient(this.wrapper!, this.config.url)
    }
    return this._statusPages
  }

  get maintenance(): MaintenanceClient {
    this.ensureAuthenticated()
    if (!this._maintenance) {
      this._maintenance = new MaintenanceClient(this.wrapper!)
    }
    return this._maintenance
  }

  get dockerHosts(): DockerHostsClient {
    this.ensureAuthenticated()
    if (!this._dockerHosts) {
      this._dockerHosts = new DockerHostsClient(this.wrapper!)
    }
    return this._dockerHosts
  }

  get apiKeys(): ApiKeysClient {
    this.ensureAuthenticated()
    if (!this._apiKeys) {
      this._apiKeys = new ApiKeysClient(this.wrapper!)
    }
    return this._apiKeys
  }

  get settings(): SettingsClient {
    this.ensureAuthenticated()
    if (!this._settings) {
      this._settings = new SettingsClient(this.wrapper!)
    }
    return this._settings
  }

  get twoFactor(): TwoFactorClient {
    this.ensureAuthenticated()
    if (!this._twoFactor) {
      this._twoFactor = new TwoFactorClient(this.wrapper!)
    }
    return this._twoFactor
  }

  get database(): DatabaseClient {
    this.ensureAuthenticated()
    if (!this._database) {
      this._database = new DatabaseClient(this.wrapper!)
    }
    return this._database
  }

  // --- Guards ---

  private ensureConnected(): void {
    if (!this.socket?.connected || !this.wrapper) {
      throw new ConnectionError('Not connected. Call connect() first.')
    }
  }

  private ensureAuthenticated(): void {
    this.ensureConnected()
    if (!this.authenticated) {
      throw new AuthenticationError('Not authenticated. Call login() first.')
    }
  }
}
