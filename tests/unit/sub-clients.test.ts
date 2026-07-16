import { describe, expect, test } from 'bun:test'

import { ApiKeysClient } from '../../src/api/api-keys'
import { DatabaseClient } from '../../src/api/database'
import { DockerHostsClient } from '../../src/api/docker-hosts'
import { MaintenanceClient } from '../../src/api/maintenance'
import { MonitorsClient } from '../../src/api/monitors'
import { NotificationsClient } from '../../src/api/notifications'
import { ProxiesClient } from '../../src/api/proxies'
import { SettingsClient } from '../../src/api/settings'
import { StatusPagesClient } from '../../src/api/status-pages'
import { TagsClient } from '../../src/api/tags'
import { TwoFactorClient } from '../../src/api/two-factor'
import { Event } from '../../src/types/event'

import { createMockSocketWrapper } from './helpers/mock-socket'

describe('MonitorsClient', () => {
  test('get returns monitor on success', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.get(1)
    mock.ackLast({ ok: true, monitor: { id: 1, name: 'test', type: 'http' } })
    const result = await promise
    expect(result.id).toBe(1)
    expect(result.name).toBe('test')
  })

  test('get throws when monitor not found', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.get(999)
    mock.ackLast({ ok: false, msg: 'Not found' })
    await expect(promise).rejects.toThrow('Failed to get monitor 999: Not found')
  })

  test('get throws when monitor is null', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.get(999)
    mock.ackLast({ ok: true })
    await expect(promise).rejects.toThrow('Failed to get monitor 999')
  })

  test('list returns monitors from cached event', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    mock.simulateEvent(Event.MONITOR_LIST, {
      '1': { id: 1, name: 'm1' },
      '2': { id: 2, name: 'm2' },
    })

    const result = await client.list()
    expect(result).toHaveLength(2)
  })

  test('add returns monitorID on success', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.add({ type: 'http', name: 'test', url: 'https://example.com' } as never)
    mock.ackLast({ ok: true, msg: 'Added Successfully.', monitorID: 42 })
    const result = await promise
    expect(result.monitorID).toBe(42)
    expect(result.msg).toBe('Added Successfully.')
  })

  test('add throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.add({ type: 'http', name: 'test', url: 'https://example.com' } as never)
    mock.ackLast({ ok: false, msg: 'Duplicate name' })
    await expect(promise).rejects.toThrow('Failed to add monitor: Duplicate name')
  })

  test('edit merges with existing monitor', async () => {
    const { mock, wrapper } = createMockSocketWrapper(5000)
    const client = new MonitorsClient(wrapper)

    const promise = client.edit(1, { interval: 30 })

    // First emit is getMonitor — acknowledge it
    mock.ack(0, { ok: true, monitor: { id: 1, name: 'old', type: 'http', interval: 60 } })

    // Wait for editMonitor emit to appear, then acknowledge it
    // Give the promise a tick to process the first ack and emit editMonitor
    await new Promise((r) => setTimeout(r, 10))
    mock.ack(1, { ok: true, msg: 'Saved.' })

    const result = await promise
    expect(result.monitorID).toBe(1)
    expect(result.msg).toBe('Saved.')

    // Verify editMonitor was called with merged data
    const editCall = mock.getEmit(1)
    expect(editCall.event).toBe('editMonitor')
    expect(editCall.args[0]).toMatchObject({ id: 1, interval: 30, name: 'old' })
  })

  test('edit throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper(5000)
    const client = new MonitorsClient(wrapper)

    const promise = client.edit(1, { interval: 30 })

    // First emit is getMonitor
    mock.ack(0, { ok: true, monitor: { id: 1, name: 'old', type: 'http' } })
    // Wait for editMonitor emit
    await new Promise((r) => setTimeout(r, 10))
    mock.ack(1, { ok: false, msg: 'Invalid data' })

    await expect(promise).rejects.toThrow('Failed to edit monitor 1: Invalid data')
  })

  test('delete succeeds', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.delete(1)
    mock.ackLast({ ok: true, msg: 'Deleted Successfully.' })
    const result = await promise
    expect(result.msg).toBe('Deleted Successfully.')
  })

  test('delete throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.delete(1)
    mock.ackLast({ ok: false, msg: 'Cannot delete' })
    await expect(promise).rejects.toThrow('Failed to delete monitor 1: Cannot delete')
  })

  test('pause succeeds', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.pause(1)
    mock.ackLast({ ok: true, msg: 'Paused Successfully.' })
    const result = await promise
    expect(result.msg).toBe('Paused Successfully.')
  })

  test('pause throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.pause(1)
    mock.ackLast({ ok: false })
    await expect(promise).rejects.toThrow('Failed to pause monitor 1')
  })

  test('resume succeeds', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.resume(1)
    mock.ackLast({ ok: true, msg: 'Resumed Successfully.' })
    const result = await promise
    expect(result.msg).toBe('Resumed Successfully.')
  })

  test('resume throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.resume(1)
    mock.ackLast({ ok: false })
    await expect(promise).rejects.toThrow('Failed to resume monitor 1')
  })

  test('getBeats returns heartbeat array', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.getBeats(1, 24)
    mock.ackLast({
      ok: true,
      data: [
        { id: 1, status: 1 },
        { id: 2, status: 0 },
      ],
    })
    const result = await promise
    expect(result).toHaveLength(2)
  })

  test('getBeats throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.getBeats(1, 24)
    mock.ackLast({ ok: false, msg: 'Error' })
    await expect(promise).rejects.toThrow('Failed to get beats for monitor 1: Error')
  })

  test('getGameList returns game list', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.getGameList()
    mock.ackLast({ gameList: [{ pretty: 'Minecraft' }] })
    const result = await promise
    expect(result).toEqual([{ pretty: 'Minecraft' }])
  })

  test('getGameList returns empty array when gameList is missing', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.getGameList()
    mock.ackLast({})
    const result = await promise
    expect(result).toEqual([])
  })

  test('testChrome succeeds', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.testChrome('/usr/bin/chromium')
    mock.ackLast({ ok: true, msg: 'Found Chromium/Chrome. Version: 90.0' })
    const result = await promise
    expect(result.msg).toContain('Chromium')
  })

  test('testChrome throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.testChrome('/bad/path')
    mock.ackLast({ ok: false, msg: 'Not found' })
    await expect(promise).rejects.toThrow('Chrome test failed: Not found')
  })

  test('getStatus returns pending when no heartbeats cached', async () => {
    const { wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)
    const status = await client.getStatus(1)
    expect(status).toBe('pending')
  })

  test('getStatus returns correct status from latest heartbeat', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    mock.simulateEvent(Event.HEARTBEAT_LIST, 1, [{ status: 1 }], true)
    const status = await client.getStatus(1)
    expect(status).toBe('up')
  })

  test('getStatus returns down when latest status is 0', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    mock.simulateEvent(Event.HEARTBEAT_LIST, 1, [{ status: 0 }], true)
    const status = await client.getStatus(1)
    expect(status).toBe('down')
  })

  test('getStatus returns pending when beats array is empty', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    mock.simulateEvent(Event.HEARTBEAT_LIST, 1, [], true)
    const status = await client.getStatus(1)
    expect(status).toBe('pending')
  })

  test('addTag succeeds', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.addTag(1, 1, 'value')
    mock.ackLast({ ok: true, msg: 'Added Successfully.' })
    const result = await promise
    expect(result.msg).toBe('Added Successfully.')
  })

  test('addTag throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.addTag(1, 1)
    mock.ackLast({ ok: false, msg: 'Tag exists' })
    await expect(promise).rejects.toThrow('Failed to add tag: Tag exists')
  })

  test('deleteTag succeeds', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.deleteTag(1, 1)
    mock.ackLast({ ok: true, msg: 'Deleted Successfully.' })
    const result = await promise
    expect(result.msg).toBe('Deleted Successfully.')
  })

  test('deleteTag throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.deleteTag(1, 1)
    mock.ackLast({ ok: false })
    await expect(promise).rejects.toThrow('Failed to delete tag')
  })

  test('clearEvents succeeds', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.clearEvents(1)
    mock.ackLast({ ok: true, msg: 'Cleared Successfully.' })
    const result = await promise
    expect(result.msg).toBe('Cleared Successfully.')
  })

  test('clearEvents throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.clearEvents(1)
    mock.ackLast({ ok: false })
    await expect(promise).rejects.toThrow('Failed to clear events')
  })

  test('clearHeartbeats succeeds', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.clearHeartbeats(1)
    mock.ackLast({ ok: true, msg: 'Cleared Successfully.' })
    const result = await promise
    expect(result.msg).toBe('Cleared Successfully.')
  })

  test('clearHeartbeats throws on failure', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MonitorsClient(wrapper)

    const promise = client.clearHeartbeats(1)
    mock.ackLast({ ok: false })
    await expect(promise).rejects.toThrow('Failed to clear heartbeats')
  })
})

describe('TagsClient', () => {
  test('list returns tags', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TagsClient(wrapper)

    const promise = client.list()
    mock.ackLast({ tags: [{ id: 1, name: 'tag1', color: '#ff0000' }] })
    const result = await promise
    expect(result).toHaveLength(1)
  })

  test('list returns empty array when tags is missing', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TagsClient(wrapper)

    const promise = client.list()
    mock.ackLast({})
    const result = await promise
    expect(result).toEqual([])
  })

  test('get returns specific tag by id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TagsClient(wrapper)

    const promise = client.get(2)
    mock.ackLast({
      tags: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    })
    const result = await promise
    expect((result as { name: string }).name).toBe('b')
  })

  test('add sends new tag with new:true flag', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TagsClient(wrapper)

    const promise = client.add({ name: 'mytag', color: '#00ff00' })
    mock.ackLast({ ok: true, id: 1 })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('addTag')
    expect(call.args[0]).toMatchObject({ new: true, name: 'mytag', color: '#00ff00' })
  })

  test('edit sends id with updates', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TagsClient(wrapper)

    const promise = client.edit(1, { name: 'updated' })
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('editTag')
    expect(call.args[0]).toMatchObject({ id: 1, name: 'updated' })
  })

  test('delete sends tag id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TagsClient(wrapper)

    const promise = client.delete(1)
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('deleteTag')
    expect(call.args[0]).toBe(1)
  })
})

describe('NotificationsClient', () => {
  test('list returns notifications from cached event', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new NotificationsClient(wrapper)

    mock.simulateEvent(Event.NOTIFICATION_LIST, {
      '1': { id: 1, name: 'email' },
    })
    const result = await client.list()
    expect(result).toHaveLength(1)
  })

  test('get returns notification by id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new NotificationsClient(wrapper)

    mock.simulateEvent(Event.NOTIFICATION_LIST, {
      '1': { id: 1, name: 'a' },
      '2': { id: 2, name: 'b' },
    })
    const result = await client.get(2)
    expect((result as { name: string }).name).toBe('b')
  })

  test('test sends test event', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new NotificationsClient(wrapper)

    const promise = client.test({
      name: 'email',
      type: 'email',
      isDefault: false,
      applyExisting: false,
    })
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('testNotification')
  })

  test('add sends addNotification with null id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new NotificationsClient(wrapper)

    const promise = client.add({
      name: 'slack',
      type: 'slack',
      isDefault: false,
      applyExisting: false,
    })
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('addNotification')
    expect(call.args[1]).toBeNull()
  })

  test('edit sends addNotification with id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new NotificationsClient(wrapper)

    const promise = client.edit(5, { name: 'updated' })
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('addNotification')
    expect(call.args[1]).toBe(5)
  })

  test('delete sends deleteNotification', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new NotificationsClient(wrapper)

    const promise = client.delete(3)
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('deleteNotification')
    expect(call.args[0]).toBe(3)
  })

  test('checkApprise returns boolean', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new NotificationsClient(wrapper)

    const promise = client.checkApprise()
    mock.ackLast({ ok: true })
    const result = await promise
    expect(result).toBe(true)
  })

  test('checkApprise returns false when not ok', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new NotificationsClient(wrapper)

    const promise = client.checkApprise()
    mock.ackLast({ ok: false })
    const result = await promise
    expect(result).toBe(false)
  })
})

describe('ProxiesClient', () => {
  test('list returns proxies from cached event', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ProxiesClient(wrapper)

    mock.simulateEvent(Event.PROXY_LIST, { '1': { id: 1, host: 'proxy1' } })
    const result = await client.list()
    expect(result).toHaveLength(1)
  })

  test('get returns proxy by id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ProxiesClient(wrapper)

    mock.simulateEvent(Event.PROXY_LIST, {
      '1': { id: 1, host: 'a' },
      '2': { id: 2, host: 'b' },
    })
    const result = await client.get(2)
    expect((result as { host: string }).host).toBe('b')
  })

  test('add sends addProxy with null id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ProxiesClient(wrapper)

    const promise = client.add({
      protocol: 'http',
      host: 'localhost',
      port: '8080',
      auth: false,
      active: true,
      default: false,
      applyExisting: false,
    })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).args[1]).toBeNull()
  })

  test('edit sends addProxy with id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ProxiesClient(wrapper)

    const promise = client.edit(2, { host: 'updated' })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).args[1]).toBe(2)
  })

  test('delete sends deleteProxy', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ProxiesClient(wrapper)

    const promise = client.delete(1)
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('deleteProxy')
  })
})

describe('StatusPagesClient', () => {
  test('list returns status pages from cached event', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new StatusPagesClient(wrapper, 'http://localhost:3001')

    mock.simulateEvent(Event.STATUS_PAGE_LIST, { home: { slug: 'home' } })
    const result = await client.list()
    expect(result).toHaveLength(1)
  })

  test('get sends getStatusPage', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new StatusPagesClient(wrapper, 'http://localhost:3001')

    const promise = client.get('home')
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('getStatusPage')
    expect(mock.getEmit(0).args[0]).toBe('home')
  })

  test('add sends addStatusPage with title and slug', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new StatusPagesClient(wrapper, 'http://localhost:3001')

    const promise = client.add('home', 'Home Page')
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('addStatusPage')
    expect(call.args[0]).toBe('Home Page')
    expect(call.args[1]).toBe('home')
  })

  test('delete sends deleteStatusPage', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new StatusPagesClient(wrapper, 'http://localhost:3001')

    const promise = client.delete('home')
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('deleteStatusPage')
  })

  test('save sends saveStatusPage', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new StatusPagesClient(wrapper, 'http://localhost:3001')

    const promise = client.save('home', { title: 'Updated' })
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('saveStatusPage')
    expect(call.args[0]).toBe('home')
  })

  test('postIncident sends postIncident', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new StatusPagesClient(wrapper, 'http://localhost:3001')

    const promise = client.postIncident('home', {
      title: 'Outage',
      content: 'Down',
      style: 'primary',
    })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('postIncident')
  })

  test('unpinIncident sends unpinIncident', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new StatusPagesClient(wrapper, 'http://localhost:3001')

    const promise = client.unpinIncident('home')
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('unpinIncident')
  })
})

describe('MaintenanceClient', () => {
  test('list returns maintenances from cached event', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    mock.simulateEvent(Event.MAINTENANCE_LIST, { '1': { id: 1, title: 'maint' } })
    const result = await client.list()
    expect(result).toHaveLength(1)
  })

  test('get sends getMaintenance', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.get(1)
    mock.ackLast({ id: 1, title: 'maint' })
    await promise

    expect(mock.getEmit(0).event).toBe('getMaintenance')
  })

  test('add sends addMaintenance', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.add({
      title: 'maint',
      strategy: 'manual',
      active: true,
      description: '',
      intervalDay: 1,
      weekdays: [],
      daysOfMonth: [],
      cron: '30 3 * * *',
      durationMinutes: 60,
    })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('addMaintenance')
  })

  test('edit sends editMaintenance with id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.edit(1, { title: 'updated' })
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('editMaintenance')
    expect(call.args[0]).toBe(1)
  })

  test('delete sends deleteMaintenance', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.delete(1)
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('deleteMaintenance')
  })

  test('pause sends pauseMaintenance', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.pause(1)
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('pauseMaintenance')
  })

  test('resume sends resumeMaintenance', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.resume(1)
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('resumeMaintenance')
  })

  test('getMonitors returns monitors array', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.getMonitors(1)
    mock.ackLast({ monitors: [{ id: 1 }, { id: 2 }] })
    const result = await promise
    expect(result).toHaveLength(2)
  })

  test('getMonitors returns empty when monitors missing', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.getMonitors(1)
    mock.ackLast({})
    const result = await promise
    expect(result).toEqual([])
  })

  test('addMonitors sends addMonitorMaintenance', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.addMonitors(1, [1, 2])
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('addMonitorMaintenance')
    expect(call.args[1]).toEqual([1, 2])
  })

  test('getStatusPages returns status pages array', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.getStatusPages(1)
    mock.ackLast({ statusPages: [{ id: 1 }] })
    const result = await promise
    expect(result).toHaveLength(1)
  })

  test('getStatusPages returns empty when missing', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.getStatusPages(1)
    mock.ackLast({})
    const result = await promise
    expect(result).toEqual([])
  })

  test('addStatusPages sends addMaintenanceStatusPage', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new MaintenanceClient(wrapper)

    const promise = client.addStatusPages(1, [1, 2])
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('addMaintenanceStatusPage')
  })
})

describe('DockerHostsClient', () => {
  test('list returns docker hosts from cached event', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new DockerHostsClient(wrapper)

    mock.simulateEvent(Event.DOCKER_HOST_LIST, { '1': { id: 1, name: 'host1' } })
    const result = await client.list()
    expect(result).toHaveLength(1)
  })

  test('get returns host by id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new DockerHostsClient(wrapper)

    mock.simulateEvent(Event.DOCKER_HOST_LIST, {
      '1': { id: 1, name: 'a' },
      '2': { id: 2, name: 'b' },
    })
    const result = await client.get(2)
    expect((result as { name: string }).name).toBe('b')
  })

  test('test sends testDockerHost', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new DockerHostsClient(wrapper)

    const promise = client.test({ name: 'test', dockerType: 'socket' })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('testDockerHost')
  })

  test('add sends addDockerHost with null id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new DockerHostsClient(wrapper)

    const promise = client.add({ name: 'host', dockerType: 'socket' })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).args[1]).toBeNull()
  })

  test('edit sends addDockerHost with id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new DockerHostsClient(wrapper)

    const promise = client.edit(1, { name: 'updated' })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).args[1]).toBe(1)
  })

  test('delete sends deleteDockerHost', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new DockerHostsClient(wrapper)

    const promise = client.delete(1)
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('deleteDockerHost')
  })
})

describe('ApiKeysClient', () => {
  test('list returns API keys from cached event', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ApiKeysClient(wrapper)

    mock.simulateEvent(Event.API_KEY_LIST, { '1': { id: 1, name: 'key1' } })
    const result = await client.list()
    expect(result).toHaveLength(1)
  })

  test('get returns key by id', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ApiKeysClient(wrapper)

    mock.simulateEvent(Event.API_KEY_LIST, {
      '1': { id: 1, name: 'a' },
      '2': { id: 2, name: 'b' },
    })
    const result = await client.get(2)
    expect((result as { name: string }).name).toBe('b')
  })

  test('add sends addAPIKey', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ApiKeysClient(wrapper)

    const promise = client.add({ name: 'key', expires: '2025-12-31', active: true })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('addAPIKey')
  })

  test('enable sends enableAPIKey', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ApiKeysClient(wrapper)

    const promise = client.enable(1)
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('enableAPIKey')
  })

  test('disable sends disableAPIKey', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ApiKeysClient(wrapper)

    const promise = client.disable(1)
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('disableAPIKey')
  })

  test('delete sends deleteAPIKey', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new ApiKeysClient(wrapper)

    const promise = client.delete(1)
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('deleteAPIKey')
  })
})

describe('SettingsClient', () => {
  test('get sends getSettings', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new SettingsClient(wrapper)

    const promise = client.get()
    mock.ackLast({ checkUpdate: true })
    const result = await promise
    expect(result).toMatchObject({ checkUpdate: true })
  })

  test('set sends setSettings', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new SettingsClient(wrapper)

    const promise = client.set({ checkUpdate: false })
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('setSettings')
  })

  test('changePassword sends changePassword', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new SettingsClient(wrapper)

    const promise = client.changePassword('old', 'new')
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('changePassword')
    expect(call.args).toEqual(['old', 'new'])
  })

  test('uploadBackup sends uploadBackup with default importHandle', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new SettingsClient(wrapper)

    const promise = client.uploadBackup('{}')
    mock.ackLast({ ok: true })
    await promise

    const call = mock.getEmit(0)
    expect(call.event).toBe('uploadBackup')
    expect(call.args[0]).toBe('{}')
    expect(call.args[1]).toBe('skip')
  })

  test('uploadBackup sends uploadBackup with custom importHandle', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new SettingsClient(wrapper)

    const promise = client.uploadBackup('{}', 'overwrite')
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).args[1]).toBe('overwrite')
  })

  test('clearStatistics sends clearStatistics', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new SettingsClient(wrapper)

    const promise = client.clearStatistics()
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('clearStatistics')
  })
})

describe('TwoFactorClient', () => {
  test('status sends twoFAStatus', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TwoFactorClient(wrapper)

    const promise = client.status()
    mock.ackLast({ ok: true, status: false })
    const result = await promise
    expect(result).toEqual({ ok: true, status: false })
  })

  test('prepare sends prepare2FA', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TwoFactorClient(wrapper)

    const promise = client.prepare('password')
    mock.ackLast({ ok: true, url: 'otpauth://...' })
    await promise

    expect(mock.getEmit(0).event).toBe('prepare2FA')
    expect(mock.getEmit(0).args[0]).toBe('password')
  })

  test('verifyToken sends verifyToken', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TwoFactorClient(wrapper)

    const promise = client.verifyToken('123456', 'password')
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).args).toEqual(['123456', 'password'])
  })

  test('save sends save2FA', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TwoFactorClient(wrapper)

    const promise = client.save('password')
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('save2FA')
  })

  test('disable sends disable2FA', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new TwoFactorClient(wrapper)

    const promise = client.disable('password')
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('disable2FA')
  })
})

describe('DatabaseClient', () => {
  test('getSize sends getDatabaseSize', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new DatabaseClient(wrapper)

    const promise = client.getSize()
    mock.ackLast({ size: 1024 })
    const result = await promise
    expect(result).toEqual({ size: 1024 })
  })

  test('shrink sends shrinkDatabase', async () => {
    const { mock, wrapper } = createMockSocketWrapper()
    const client = new DatabaseClient(wrapper)

    const promise = client.shrink()
    mock.ackLast({ ok: true })
    await promise

    expect(mock.getEmit(0).event).toBe('shrinkDatabase')
  })
})
