import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers'

import { UptimeKumaApi } from '../src/client'
import { AuthenticationError } from '../src/errors'
import { cleanupAllMonitors, setupUptimeKuma, waitForUptimeKuma } from './helpers'

const KUMA_IMAGE = 'louislam/uptime-kuma:2'
const KUMA_USERNAME = 'admin'
const KUMA_PASSWORD = 'admin123'

describe('Uptime Kuma Integration Tests', () => {
  let container: StartedTestContainer
  let api: UptimeKumaApi
  let url: string

  beforeAll(async () => {
    container = await new GenericContainer(KUMA_IMAGE)
      .withExposedPorts(3001)
      .withTmpFs({ '/app/data': 'rw,size=200m' })
      .withEnvironment({
        UPTIME_KUMA_DB_TYPE: 'sqlite',
        UPTIME_KUMA_DB_NAME: 'kuma',
        UPTIME_KUMA_DB_USERNAME: 'kuma',
        UPTIME_KUMA_DB_PASSWORD: 'kuma',
      })
      .withWaitStrategy(Wait.forHttp('/setup', 3001).forStatusCode(200))
      .withStartupTimeout(60_000)
      .start()

    url = `http://localhost:${container.getMappedPort(3001)}`

    await waitForUptimeKuma(url, 30_000)
    await setupUptimeKuma(url, KUMA_USERNAME, KUMA_PASSWORD)
    await cleanupAllMonitors(url, KUMA_USERNAME, KUMA_PASSWORD)

    api = new UptimeKumaApi({ url })
    await api.connect()
    await api.login(KUMA_USERNAME, KUMA_PASSWORD)
  }, 90_000)

  afterAll(async () => {
    if (api) {
      try {
        await api.disconnect()
      } catch (error) {
        console.error('Failed to disconnect:', error)
      }
    }
    if (container) {
      await container.stop()
    }
  })

  test('connects and authenticates successfully', () => {
    expect(api).toBeDefined()
  })

  test('returns server info', async () => {
    const info = await api.info()
    expect(info).toBeDefined()
    expect(typeof info).toBe('object')
    expect(info).toHaveProperty('version')
  })

  test('returns server version', async () => {
    const version = api.version
    expect(typeof version).toBe('string')
    expect(version.length).toBeGreaterThan(0)
  })

  describe('monitors', () => {
    const monitorName = `integration-test-monitor-${Date.now()}`
    let monitorId: number

    test('add creates a new monitor and returns its ID', async () => {
      const result = await api.monitors.add({
        type: 'http',
        name: monitorName,
        url: 'https://example.com',
      })

      expect(result.monitorID).toBeGreaterThan(0)
      expect(result.msg).toBeTruthy()
      monitorId = result.monitorID
    })

    test('list returns an array that can be queried', async () => {
      const monitors = await api.monitors.list()
      expect(Array.isArray(monitors)).toBe(true)
    })

    test('get returns full monitor details', async () => {
      const monitor = await api.monitors.get(monitorId)

      expect(monitor.id).toBe(monitorId)
      expect(monitor.name).toBe(monitorName)
      expect(monitor.type).toBe('http')
    })

    test('edit updates monitor fields', async () => {
      await api.monitors.edit(monitorId, { interval: 120 })

      const updated = await api.monitors.get(monitorId)
      expect(updated.interval).toBe(120)
    })

    test('pause changes monitor to inactive', async () => {
      const result = await api.monitors.pause(monitorId)
      expect(result.msg).toBeTruthy()
    })

    test('resume changes monitor back to active', async () => {
      const result = await api.monitors.resume(monitorId)
      expect(result.msg).toBeTruthy()
    })

    test('delete removes monitor', async () => {
      await api.monitors.delete(monitorId)

      await expect(api.monitors.get(monitorId)).rejects.toThrow(
        `Failed to get monitor ${monitorId}`,
      )
    })
  })

  describe('tags', () => {
    const tagName = `integration-test-tag-${Date.now()}`

    beforeAll(async () => {
      if (!api.isConnected()) {
        await api.connect()
      }
    })

    test('add creates a new tag', async () => {
      const result = (await api.tags.add({
        name: tagName,
        color: '#ff0000',
      })) as { ok: boolean; id?: number }

      expect(result.ok).toBe(true)
      if (result.id !== undefined) {
        expect(result.id).toBeGreaterThan(0)
      }
    })

    test('list includes the newly created tag', async () => {
      const tags = (await api.tags.list()) as Array<{ id: number; name: string }>
      const found = tags.find((t) => t.name === tagName)

      expect(found).toBeDefined()
      expect(found!.name).toBe(tagName)
    })

    test('get returns specific tag by id', async () => {
      const tags = (await api.tags.list()) as Array<{ id: number; name: string }>
      const existing = tags.find((t) => t.name === tagName)!

      const tag = (await api.tags.get(existing.id)) as { id: number; name: string; color: string }
      expect(tag).toBeDefined()
      expect(tag.name).toBe(tagName)
      expect(tag.color).toBe('#ff0000')
    })

    test('delete removes tag', async () => {
      const tags = (await api.tags.list()) as Array<{ id: number; name: string }>
      const existing = tags.find((t) => t.name === tagName)!

      await api.tags.delete(existing.id)

      const afterDelete = (await api.tags.list()) as Array<{ id: number; name: string }>
      const stillThere = afterDelete.find((t) => t.name === tagName)
      expect(stillThere).toBeUndefined()
    })
  })

  describe('error paths', () => {
    test('login with invalid credentials throws AuthenticationError', async () => {
      const badApi = new UptimeKumaApi({ url, timeout: 5000 })
      await badApi.connect()
      try {
        await expect(badApi.login(KUMA_USERNAME, 'wrong-password')).rejects.toThrow(
          AuthenticationError,
        )
        await expect(badApi.login(KUMA_USERNAME, 'wrong-password')).rejects.toThrow('Login failed')
      } finally {
        await badApi.disconnect()
      }
    })

    test('methods throw when not connected', () => {
      const disconnected = new UptimeKumaApi({ url })
      expect(() => disconnected.login(KUMA_USERNAME, KUMA_PASSWORD)).toThrow('Not connected')
      expect(() => disconnected.info()).toThrow('Not connected')
    })
  })

  describe('sub-client reads', () => {
    beforeAll(async () => {
      if (!api.isConnected()) {
        await api.connect()
      }
    })

    test('notification list returns an array', async () => {
      const list = await api.notifications.list()
      expect(Array.isArray(list)).toBe(true)
    })

    test('proxy list returns an array', async () => {
      const list = await api.proxies.list()
      expect(Array.isArray(list)).toBe(true)
    })

    test('status page list returns an array', async () => {
      const list = await api.statusPages.list()
      expect(Array.isArray(list)).toBe(true)
    })

    test('maintenance list returns an array', async () => {
      const list = await api.maintenance.list()
      expect(Array.isArray(list)).toBe(true)
    })

    test('docker host list returns an array', async () => {
      const list = await api.dockerHosts.list()
      expect(Array.isArray(list)).toBe(true)
    })

    test('API key list returns an array', async () => {
      const list = await api.apiKeys.list()
      expect(Array.isArray(list)).toBe(true)
    })

    test('settings get returns an object', async () => {
      const settings = (await api.settings.get()) as Record<string, unknown>
      expect(settings).toBeDefined()
      expect(typeof settings).toBe('object')
    })

    test('database getSize returns size info', async () => {
      const size = (await api.database.getSize()) as { size: number }
      expect(size).toBeDefined()
      expect(typeof size.size).toBe('number')
    })

    test('twoFactor status returns status', async () => {
      const result = await api.twoFactor.status()
      expect(result.ok).toBe(true)
      // 2FA is not set up by default
      expect(result.status).toBe(false)
    })
  })
})
