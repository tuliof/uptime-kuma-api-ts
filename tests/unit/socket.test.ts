import { describe, expect, test } from 'bun:test'
import type { Socket } from 'socket.io-client'
import { Timeout } from '../../src/errors'
import { Event } from '../../src/types/event'
import { createMockSocketWrapper } from './helpers/mock-socket'

describe('SocketWrapper', () => {
  describe('emitWithAck', () => {
    test('resolves with the ack callback response', async () => {
      const { mock, wrapper } = createMockSocketWrapper()

      const promise = wrapper.emitWithAck<{ ok: boolean; data: string }>('getMonitor', 1)
      mock.ackLast({ ok: true, data: 'response' })

      const result = await promise
      expect(result).toEqual({ ok: true, data: 'response' })
    })

    test('passes all arguments to socket.emit', async () => {
      const { mock, wrapper } = createMockSocketWrapper()

      const promise = wrapper.emitWithAck('getMonitorBeats', 1, 24)
      mock.ackLast({ ok: true, data: [] })

      await promise

      const call = mock.getEmit(0)
      expect(call.event).toBe('getMonitorBeats')
      expect(call.args).toEqual([1, 24])
    })

    test('rejects with Timeout when no ack arrives within timeout', async () => {
      const { wrapper } = createMockSocketWrapper(50)

      const promise = wrapper.emitWithAck('slowEvent')
      await expect(promise).rejects.toThrow(Timeout)
      await expect(promise).rejects.toThrow("Timed out waiting for response to 'slowEvent'")
    })
  })

  describe('getEventData', () => {
    test('returns data immediately when already cached', async () => {
      const { mock, wrapper } = createMockSocketWrapper()

      // Simulate a monitorList event arriving
      mock.simulateEvent(Event.MONITOR_LIST, { '1': { id: 1, name: 'test' } })

      const data = await wrapper.getEventData('monitorList')
      expect(data).toEqual({ '1': { id: 1, name: 'test' } })
    })

    test('waits until data arrives', async () => {
      const { mock, wrapper } = createMockSocketWrapper(2000)

      // Start waiting before data arrives
      const promise = wrapper.getEventData('notificationList')

      // Simulate event arrival after a short delay
      setTimeout(() => {
        mock.simulateEvent(Event.NOTIFICATION_LIST, { '1': { id: 1 } })
      }, 50)

      const data = await promise
      expect(data).toEqual({ '1': { id: 1 } })
    })

    test('throws Timeout when data never arrives', async () => {
      const { wrapper } = createMockSocketWrapper(50)

      await expect(wrapper.getEventData('proxyList')).rejects.toThrow(Timeout)
      await expect(wrapper.getEventData('proxyList')).rejects.toThrow(
        'Timed out waiting for event proxyList',
      )
    })
  })

  describe('getCachedEventData', () => {
    test('returns null when no data cached', () => {
      const { wrapper } = createMockSocketWrapper()
      expect(wrapper.getCachedEventData('monitorList')).toBeNull()
    })

    test('returns cached data when available', () => {
      const { mock, wrapper } = createMockSocketWrapper()
      mock.simulateEvent(Event.MONITOR_LIST, { '1': { id: 1 } })
      expect(wrapper.getCachedEventData('monitorList')).toEqual({ '1': { id: 1 } })
    })

    test('returns cached autoLogin boolean', () => {
      const { mock, wrapper } = createMockSocketWrapper()
      mock.simulateEvent(Event.AUTO_LOGIN)
      expect(wrapper.getCachedEventData('autoLogin')).toBe(true)
    })
  })

  describe('waitForEvent', () => {
    test('resolves when the event arrives', async () => {
      const { mock, wrapper } = createMockSocketWrapper(2000)

      const promise = wrapper.waitForEvent('customEvent')
      setTimeout(() => mock.simulateEvent('customEvent'), 30)

      await expect(promise).resolves.toBeUndefined()
    })

    test('rejects with Timeout when event never arrives', async () => {
      const { wrapper } = createMockSocketWrapper(50)
      await expect(wrapper.waitForEvent('neverArrives')).rejects.toThrow(Timeout)
    })
  })

  describe('clearEventData', () => {
    test('resets all cached data to null', () => {
      const { mock, wrapper } = createMockSocketWrapper()

      mock.simulateEvent(Event.MONITOR_LIST, { '1': {} })
      mock.simulateEvent(Event.NOTIFICATION_LIST, { '2': {} })

      expect(wrapper.getCachedEventData('monitorList')).not.toBeNull()
      expect(wrapper.getCachedEventData('notificationList')).not.toBeNull()

      wrapper.clearEventData()

      expect(wrapper.getCachedEventData('monitorList')).toBeNull()
      expect(wrapper.getCachedEventData('notificationList')).toBeNull()
    })
  })

  describe('getSocket', () => {
    test('returns the underlying socket', () => {
      const { mock, wrapper } = createMockSocketWrapper()
      expect(wrapper.getSocket()).toBe(mock as unknown as Socket)
    })
  })
})

describe('SocketWrapper event handlers', () => {
  test('monitorList handler caches data', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const data = { '1': { id: 1, name: 'm1' } }
    mock.simulateEvent(Event.MONITOR_LIST, data)
    expect(wrapper.getCachedEventData('monitorList')).toEqual(data)
  })

  test('notificationList handler caches data', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const data = { '1': { id: 1, name: 'n1' } }
    mock.simulateEvent(Event.NOTIFICATION_LIST, data)
    expect(wrapper.getCachedEventData('notificationList')).toEqual(data)
  })

  test('proxyList handler caches data', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    mock.simulateEvent(Event.PROXY_LIST, { '1': { id: 1 } })
    expect(wrapper.getCachedEventData('proxyList')).toEqual({ '1': { id: 1 } })
  })

  test('statusPageList handler caches data', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    mock.simulateEvent(Event.STATUS_PAGE_LIST, { '1': { id: 1 } })
    expect(wrapper.getCachedEventData('statusPageList')).toEqual({ '1': { id: 1 } })
  })

  test('dockerHostList handler caches data', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    mock.simulateEvent(Event.DOCKER_HOST_LIST, { '1': { id: 1 } })
    expect(wrapper.getCachedEventData('dockerHostList')).toEqual({ '1': { id: 1 } })
  })

  test('maintenanceList handler caches data', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    mock.simulateEvent(Event.MAINTENANCE_LIST, { '1': { id: 1 } })
    expect(wrapper.getCachedEventData('maintenanceList')).toEqual({ '1': { id: 1 } })
  })

  test('apiKeyList handler caches data', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    mock.simulateEvent(Event.API_KEY_LIST, { '1': { id: 1 } })
    expect(wrapper.getCachedEventData('apiKeyList')).toEqual({ '1': { id: 1 } })
  })

  test('autoLogin handler caches true', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    mock.simulateEvent(Event.AUTO_LOGIN)
    expect(wrapper.getCachedEventData('autoLogin')).toBe(true)
  })

  test('info handler caches data only when version is present', () => {
    const { mock, wrapper } = createMockSocketWrapper()

    // Without version → should NOT cache
    mock.simulateEvent(Event.INFO, { someField: 'x' })
    expect(wrapper.getCachedEventData('info')).toBeNull()

    // With version → should cache
    mock.simulateEvent(Event.INFO, { version: '1.23.0', timezone: 'UTC' })
    expect(wrapper.getCachedEventData('info')).toEqual({ version: '1.23.0', timezone: 'UTC' })
  })

  test('avgPing handler caches by monitor id', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    mock.simulateEvent(Event.AVG_PING, 1, 42.5)
    mock.simulateEvent(Event.AVG_PING, 2, 100)

    const data = wrapper.getCachedEventData('avgPing')
    expect(data).toEqual({ 1: 42.5, 2: 100 })
  })

  test('uptime handler caches by monitor id and type', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    mock.simulateEvent(Event.UPTIME, 1, '24h', 99.9)
    mock.simulateEvent(Event.UPTIME, 1, '720h', 98.5)
    mock.simulateEvent(Event.UPTIME, 2, '24h', 100)

    const data = wrapper.getCachedEventData('uptime')
    expect(data).toEqual({
      1: { '24h': 99.9, '720h': 98.5 },
      2: { '24h': 100 },
    })
  })

  test('heartbeatList handler caches and appends', () => {
    const { mock, wrapper } = createMockSocketWrapper()

    // First arrival with overwrite
    mock.simulateEvent(Event.HEARTBEAT_LIST, 1, [{ id: 1, status: 1 }], true)
    let beats = wrapper.getCachedEventData('heartbeatList')
    expect(beats).toEqual({ 1: [{ id: 1, status: 1 }] })

    // Second arrival without overwrite → appends
    mock.simulateEvent(Event.HEARTBEAT_LIST, 1, [{ id: 2, status: 0 }], false)
    beats = wrapper.getCachedEventData('heartbeatList')
    expect(beats![1]).toHaveLength(2)
    expect(beats![1]![1]).toEqual({ id: 2, status: 0 })
  })

  test('importantHeartbeatList handler caches and appends', () => {
    const { mock, wrapper } = createMockSocketWrapper()

    mock.simulateEvent(Event.IMPORTANT_HEARTBEAT_LIST, 1, [{ id: 10 }], true)
    mock.simulateEvent(Event.IMPORTANT_HEARTBEAT_LIST, 1, [{ id: 11 }], false)

    const beats = wrapper.getCachedEventData('importantHeartbeatList')
    expect(beats![1]).toHaveLength(2)
  })

  test('heartbeat handler appends to heartbeatList and caps at 150', () => {
    const { mock, wrapper } = createMockSocketWrapper()

    // Add 151 heartbeats for monitor 1
    for (let i = 0; i < 151; i++) {
      mock.simulateEvent(Event.HEARTBEAT, { monitorID: 1, id: i, status: 1, important: false })
    }

    const beats = wrapper.getCachedEventData('heartbeatList')
    // After push, length >= 150 triggers shift, so max stays at 149
    expect(beats![1]).toHaveLength(149)
    // First two beats should have been shifted out
    expect(beats![1]![0]).toEqual({ monitorID: 1, id: 2, status: 1, important: false })
  })

  test('heartbeat handler adds important beats to importantHeartbeatList', () => {
    const { mock, wrapper } = createMockSocketWrapper()

    mock.simulateEvent(Event.HEARTBEAT, { monitorID: 1, id: 100, status: 0, important: true })
    mock.simulateEvent(Event.HEARTBEAT, { monitorID: 1, id: 101, status: 1, important: false })
    mock.simulateEvent(Event.HEARTBEAT, { monitorID: 1, id: 102, status: 0, important: true })

    const important = wrapper.getCachedEventData('importantHeartbeatList')
    // Important beats are unshifted (prepended), so most recent first
    expect(important![1]).toHaveLength(2)
    expect(important![1]![0]).toEqual({ monitorID: 1, id: 102, status: 0, important: true })
    expect(important![1]![1]).toEqual({ monitorID: 1, id: 100, status: 0, important: true })
  })

  test('certInfo handler parses JSON data', () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const certData = { validTo: '2025-12-31', issuer: 'Let us Encrypt' }

    mock.simulateEvent(Event.CERT_INFO, 1, JSON.stringify(certData))

    const data = wrapper.getCachedEventData('certInfo')
    expect(data![1]).toEqual(certData)
  })

  test('certInfo handler stores raw value when JSON parse fails', () => {
    const { mock, wrapper } = createMockSocketWrapper()

    mock.simulateEvent(Event.CERT_INFO, 1, 'not-valid-json')

    const data = wrapper.getCachedEventData('certInfo')
    expect(data![1]).toBe('not-valid-json')
  })
})
