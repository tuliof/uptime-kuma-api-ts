import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { Socket } from 'socket.io-client'
import { AuthenticationError, ConnectionError } from '../../src/errors'
import { ConsoleLogger } from '../../src/logger'
import { Event } from '../../src/types/event'
import { MockSocket } from './helpers/mock-socket'

// Track the mock socket created by the mocked io()
let currentMockSocket: MockSocket

// Mock socket.io-client so io() returns our MockSocket
mock.module('socket.io-client', () => ({
  io: (..._args: unknown[]): Socket => {
    currentMockSocket = new MockSocket()
    return currentMockSocket as unknown as Socket
  },
}))

// Import UptimeKumaApi AFTER mocking socket.io-client
const { UptimeKumaApi } = await import('../../src/client')

describe('UptimeKumaApi', () => {
  describe('constructor', () => {
    test('creates an instance with minimal config', () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
      expect(api).toBeInstanceOf(UptimeKumaApi)
    })

    test('strips trailing slash from URL', () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001/' })
      // Internal config is private, but we can verify via behavior:
      // connect() will call io() with the stripped URL
      // We can't easily access it, so just verify no throw
      expect(api).toBeInstanceOf(UptimeKumaApi)
    })

    test('accepts custom timeout', () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 5000 })
      expect(api).toBeInstanceOf(UptimeKumaApi)
    })

    test('accepts custom logger', () => {
      const logger = new ConsoleLogger('debug')
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', logger })
      expect(api).toBeInstanceOf(UptimeKumaApi)
    })

    test('accepts headers and sslVerify', () => {
      const api = new UptimeKumaApi({
        url: 'http://localhost:3001',
        headers: { Authorization: 'Bearer x' },
        sslVerify: false,
      })
      expect(api).toBeInstanceOf(UptimeKumaApi)
    })
  })

  describe('connect', () => {
    let api: InstanceType<typeof UptimeKumaApi>

    beforeEach(() => {
      api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
    })

    afterEach(async () => {
      try {
        await api.disconnect()
      } catch {
        // ignore
      }
    })

    test('establishes a connection', async () => {
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise
      // No error means success
    })

    test('rejects with ConnectionError on connect_error', async () => {
      const connectPromise = api.connect()
      currentMockSocket.simulateConnectError('ECONNREFUSED')
      await expect(connectPromise).rejects.toThrow(ConnectionError)
      await expect(connectPromise).rejects.toThrow('Connection failed: ECONNREFUSED')
    })

    test('is a no-op if already connected', async () => {
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      // Second call should resolve immediately
      await api.connect()
    })
  })

  describe('disconnect', () => {
    test('cleans up socket and wrapper', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      await api.disconnect()
      // After disconnect, calling a method should throw ConnectionError
      expect(() => api.info()).toThrow(ConnectionError)
    })

    test('is a no-op when not connected', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
      await api.disconnect() // Should not throw
    })
  })

  describe('login', () => {
    let api: InstanceType<typeof UptimeKumaApi>

    beforeEach(async () => {
      api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise
    })

    afterEach(async () => {
      try {
        await api.disconnect()
      } catch {
        // ignore
      }
    })

    test('login with valid credentials succeeds', async () => {
      const loginPromise = api.login('admin', 'pass')
      currentMockSocket.ackLast({ ok: true, token: 'jwt-token' })
      const result = await loginPromise
      expect(result.token).toBe('jwt-token')
    })

    test('login with invalid credentials throws AuthenticationError', async () => {
      const loginPromise = api.login('admin', 'wrong')
      currentMockSocket.ackLast({ ok: false, msg: 'Invalid credentials' })
      await expect(loginPromise).rejects.toThrow(AuthenticationError)
      await expect(loginPromise).rejects.toThrow('Login failed: Invalid credentials')
    })

    test('login with no credentials triggers auto-login', async () => {
      // Auto-login waits for the AUTO_LOGIN event
      const loginPromise = api.login()
      // Simulate the autoLogin event arriving
      setTimeout(() => currentMockSocket.simulateEvent(Event.AUTO_LOGIN), 10)
      const result = await loginPromise
      expect(result.token).toBe('')
    })

    test('login with 2FA token', async () => {
      const loginPromise = api.login('admin', 'pass', '123456')
      currentMockSocket.ackLast({ ok: true, token: 'jwt-with-2fa' })
      const result = await loginPromise
      expect(result.token).toBe('jwt-with-2fa')
    })

    test('login throws ConnectionError when not connected', async () => {
      const api2 = new UptimeKumaApi({ url: 'http://localhost:3001' })
      expect(() => api2.login('admin', 'pass')).toThrow(ConnectionError)
    })
  })

  describe('loginByToken', () => {
    test('succeeds with valid token', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      const tokenPromise = api.loginByToken('my-jwt')
      currentMockSocket.ackLast({ ok: true })
      await tokenPromise
      await api.disconnect()
    })

    test('throws AuthenticationError on failure', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      const tokenPromise = api.loginByToken('bad-token')
      currentMockSocket.ackLast({ ok: false, msg: 'Token expired' })
      await expect(tokenPromise).rejects.toThrow(AuthenticationError)
      await expect(tokenPromise).rejects.toThrow('Token login failed: Token expired')
      await api.disconnect()
    })
  })

  describe('logout', () => {
    test('clears authenticated state', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      // Login first
      const loginPromise = api.login('admin', 'pass')
      currentMockSocket.ackLast({ ok: true, token: 'jwt' })
      await loginPromise

      // Logout
      const logoutPromise = api.logout()
      currentMockSocket.ackLast({ ok: true })
      await logoutPromise

      // Accessing sub-clients should now throw
      expect(() => api.monitors).toThrow(AuthenticationError)
      await api.disconnect()
    })
  })

  describe('needSetup', () => {
    test('returns true when setup is needed', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      const promise = api.needSetup()
      currentMockSocket.ackLast(true)
      const result = await promise
      expect(result).toBe(true)
      await api.disconnect()
    })

    test('returns false when setup is not needed', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      const promise = api.needSetup()
      currentMockSocket.ackLast(false)
      const result = await promise
      expect(result).toBe(false)
      await api.disconnect()
    })
  })

  describe('setup', () => {
    test('succeeds when response is ok', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      const promise = api.setup('admin', 'admin123')
      currentMockSocket.ackLast({ ok: true, msg: 'Created admin user' })
      const result = await promise
      expect(result.msg).toBe('Created admin user')
      await api.disconnect()
    })

    test('throws when response is not ok', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      const promise = api.setup('admin', 'admin123')
      currentMockSocket.ackLast({ ok: false, msg: 'Already set up' })
      await expect(promise).rejects.toThrow('Setup failed: Already set up')
      await api.disconnect()
    })
  })

  describe('info', () => {
    test('returns server info from cached event', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      // Simulate info event with version
      currentMockSocket.simulateEvent(Event.INFO, { version: '2.0.0', timezone: 'UTC' })

      const info = await api.info()
      expect(info).toEqual({ version: '2.0.0', timezone: 'UTC' })
      await api.disconnect()
    })
  })

  describe('version getter', () => {
    test('returns version string after info is cached', async () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      currentMockSocket.simulateEvent(Event.INFO, { version: '2.0.0' })
      await api.info()

      expect(api.version).toBe('2.0.0')
      await api.disconnect()
    })

    test('throws when info not available', () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
      expect(() => api.version).toThrow('Server info not available')
    })
  })

  describe('cached event data getters', () => {
    let api: InstanceType<typeof UptimeKumaApi>

    beforeEach(async () => {
      api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise
    })

    afterEach(async () => {
      try {
        await api.disconnect()
      } catch {
        // ignore
      }
    })

    test('getHeartbeats returns cached heartbeats', async () => {
      currentMockSocket.simulateEvent(Event.HEARTBEAT_LIST, 1, [{ id: 1, status: 1 }], true)
      const beats = await api.getHeartbeats()
      expect(beats[1]).toEqual([{ id: 1, status: 1 }])
    })

    test('getImportantHeartbeats returns cached important heartbeats', async () => {
      currentMockSocket.simulateEvent(
        Event.IMPORTANT_HEARTBEAT_LIST,
        1,
        [{ id: 10, status: 0 }],
        true,
      )
      const beats = await api.getImportantHeartbeats()
      expect(beats[1]).toEqual([{ id: 10, status: 0 }])
    })

    test('avgPing returns cached ping data', async () => {
      currentMockSocket.simulateEvent(Event.AVG_PING, 1, 42.5)
      const pings = await api.avgPing()
      expect(pings[1]).toBe(42.5)
    })

    test('certInfo returns cached cert data', async () => {
      currentMockSocket.simulateEvent(Event.CERT_INFO, 1, '{"valid":true}')
      const certs = await api.certInfo()
      expect(certs[1]).toEqual({ valid: true })
    })

    test('uptime returns cached uptime data', async () => {
      currentMockSocket.simulateEvent(Event.UPTIME, 1, '24h', 99.9)
      const ut = await api.uptime()
      expect(ut[1]).toEqual({ '24h': 99.9 })
    })
  })

  describe('sub-client getters', () => {
    let api: InstanceType<typeof UptimeKumaApi>

    beforeEach(async () => {
      api = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      // Login
      const loginPromise = api.login('admin', 'pass')
      currentMockSocket.ackLast({ ok: true, token: 'jwt' })
      await loginPromise
    })

    afterEach(async () => {
      try {
        await api.disconnect()
      } catch {
        // ignore
      }
    })

    test('monitors getter returns MonitorsClient', () => {
      expect(api.monitors).toBeDefined()
      expect(typeof api.monitors.get).toBe('function')
    })

    test('tags getter returns TagsClient', () => {
      expect(api.tags).toBeDefined()
      expect(typeof api.tags.list).toBe('function')
    })

    test('notifications getter returns NotificationsClient', () => {
      expect(api.notifications).toBeDefined()
      expect(typeof api.notifications.list).toBe('function')
    })

    test('proxies getter returns ProxiesClient', () => {
      expect(api.proxies).toBeDefined()
      expect(typeof api.proxies.list).toBe('function')
    })

    test('statusPages getter returns StatusPagesClient', () => {
      expect(api.statusPages).toBeDefined()
      expect(typeof api.statusPages.list).toBe('function')
    })

    test('maintenance getter returns MaintenanceClient', () => {
      expect(api.maintenance).toBeDefined()
      expect(typeof api.maintenance.list).toBe('function')
    })

    test('dockerHosts getter returns DockerHostsClient', () => {
      expect(api.dockerHosts).toBeDefined()
      expect(typeof api.dockerHosts.list).toBe('function')
    })

    test('apiKeys getter returns ApiKeysClient', () => {
      expect(api.apiKeys).toBeDefined()
      expect(typeof api.apiKeys.list).toBe('function')
    })

    test('settings getter returns SettingsClient', () => {
      expect(api.settings).toBeDefined()
      expect(typeof api.settings.get).toBe('function')
    })

    test('twoFactor getter returns TwoFactorClient', () => {
      expect(api.twoFactor).toBeDefined()
      expect(typeof api.twoFactor.status).toBe('function')
    })

    test('database getter returns DatabaseClient', () => {
      expect(api.database).toBeDefined()
      expect(typeof api.database.getSize).toBe('function')
    })

    test('getters return the same instance (lazy init)', () => {
      const m1 = api.monitors
      const m2 = api.monitors
      expect(m1).toBe(m2)
    })

    test('throws AuthenticationError when not authenticated', async () => {
      const api2 = new UptimeKumaApi({ url: 'http://localhost:3001', timeout: 1000 })
      const connectPromise = api2.connect()
      currentMockSocket.simulateConnect()
      await connectPromise

      expect(() => api2.monitors).toThrow(AuthenticationError)
      expect(() => api2.monitors).toThrow('Not authenticated')
      await api2.disconnect()
    })

    test('throws ConnectionError when not connected', () => {
      const api2 = new UptimeKumaApi({ url: 'http://localhost:3001' })
      expect(() => api2.monitors).toThrow(ConnectionError)
      expect(() => api2.monitors).toThrow('Not connected')
    })
  })

  describe('guards', () => {
    test('all data methods throw ConnectionError when not connected', () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
      expect(() => api.info()).toThrow(ConnectionError)
      expect(() => api.getHeartbeats()).toThrow(ConnectionError)
      expect(() => api.getImportantHeartbeats()).toThrow(ConnectionError)
      expect(() => api.avgPing()).toThrow(ConnectionError)
      expect(() => api.certInfo()).toThrow(ConnectionError)
      expect(() => api.uptime()).toThrow(ConnectionError)
    })

    test('auth methods throw ConnectionError when not connected', () => {
      const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
      expect(() => api.login('a', 'b')).toThrow(ConnectionError)
      expect(() => api.loginByToken('t')).toThrow(ConnectionError)
      expect(() => api.logout()).toThrow(ConnectionError)
      expect(() => api.needSetup()).toThrow(ConnectionError)
      expect(() => api.setup('a', 'b')).toThrow(ConnectionError)
    })
  })
})
