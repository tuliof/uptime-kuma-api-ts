import type { Socket } from 'socket.io-client'
import { Timeout } from './errors'
import { Event } from './types/event'

/**
 * Cached event data store. Populated by registered socket event handlers
 * and consumed by getter methods.
 */
interface EventDataStore {
  [Event.MONITOR_LIST]: Record<string, unknown> | null
  [Event.NOTIFICATION_LIST]: Record<string, unknown> | null
  [Event.PROXY_LIST]: Record<string, unknown> | null
  [Event.STATUS_PAGE_LIST]: Record<string, unknown> | null
  [Event.HEARTBEAT_LIST]: Record<number, unknown[]> | null
  [Event.IMPORTANT_HEARTBEAT_LIST]: Record<number, unknown[]> | null
  [Event.AVG_PING]: Record<number, unknown> | null
  [Event.UPTIME]: Record<number, Record<string, unknown>> | null
  [Event.INFO]: Record<string, unknown> | null
  [Event.CERT_INFO]: Record<number, unknown> | null
  [Event.DOCKER_HOST_LIST]: Record<string, unknown> | null
  [Event.AUTO_LOGIN]: boolean | null
  [Event.MAINTENANCE_LIST]: Record<string, unknown> | null
  [Event.API_KEY_LIST]: Record<string, unknown> | null
}

interface PendingResolver {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * Wraps a Socket.IO Socket with:
 * - Promise-based emitWithAck for request/response calls
 * - Event data caching with deferred resolution (no polling)
 * - waitForEvent utility for one-time event waits
 */
export class SocketWrapper {
  private eventData: EventDataStore
  private readonly timeout: number
  private pendingResolvers = new Map<string, PendingResolver[]>()

  constructor(
    private readonly socket: Socket,
    timeout: number = 10000,
  ) {
    this.timeout = timeout
    this.eventData = {
      [Event.MONITOR_LIST]: null,
      [Event.NOTIFICATION_LIST]: null,
      [Event.PROXY_LIST]: null,
      [Event.STATUS_PAGE_LIST]: null,
      [Event.HEARTBEAT_LIST]: null,
      [Event.IMPORTANT_HEARTBEAT_LIST]: null,
      [Event.AVG_PING]: null,
      [Event.UPTIME]: null,
      [Event.INFO]: null,
      [Event.CERT_INFO]: null,
      [Event.DOCKER_HOST_LIST]: null,
      [Event.AUTO_LOGIN]: null,
      [Event.MAINTENANCE_LIST]: null,
      [Event.API_KEY_LIST]: null,
    }

    this.registerEventHandlers()
  }

  /** Emit an event and wait for the ack callback response. */
  emitWithAck<T = unknown>(event: string, ...args: unknown[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Timeout(`Timed out waiting for response to '${event}'`))
      }, this.timeout)

      this.socket.emit(event, ...args, (response: T) => {
        clearTimeout(timer)
        resolve(response)
      })
    })
  }

  /**
   * Get cached event data. Returns immediately if already populated,
   * otherwise registers a deferred promise that resolves when the event
   * handler fires (no polling).
   */
  async getEventData<K extends keyof EventDataStore>(
    event: K,
  ): Promise<NonNullable<EventDataStore[K]>> {
    if (this.eventData[event] !== null) {
      return this.eventData[event] as NonNullable<EventDataStore[K]>
    }

    return new Promise<NonNullable<EventDataStore[K]>>((resolve, reject) => {
      const wrappedReject = (err: Error) => {
        reject(err)
      }
      const wrappedResolve: (value: unknown) => void = (value) => {
        resolve(value as NonNullable<EventDataStore[K]>)
      }

      const timer = setTimeout(() => {
        this.removePendingResolver(event as string, wrappedResolve)
        wrappedReject(new Timeout(`Timed out waiting for event ${event}`))
      }, this.timeout)

      this.pendingResolvers.set(event as string, [
        ...(this.pendingResolvers.get(event as string) || []),
        { resolve: wrappedResolve, reject: wrappedReject, timer },
      ])
    })
  }

  /** Get cached event data if available, or null. */
  getCachedEventData<K extends keyof EventDataStore>(event: K): EventDataStore[K] {
    return this.eventData[event]
  }

  /** Wait for a specific event to arrive (one-time listener). */
  async waitForEvent(event: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.socket.off(event, handler)
        reject(new Timeout(`Timed out waiting for event ${event}`))
      }, this.timeout)

      const handler = () => {
        clearTimeout(timer)
        this.socket.off(event, handler)
        resolve()
      }
      this.socket.on(event, handler)
    })
  }

  /** Clear all cached event data (useful after reconnection). */
  clearEventData(): void {
    for (const key of Object.keys(this.eventData) as (keyof EventDataStore)[]) {
      this.eventData[key] = null
    }
  }

  /** Get the underlying Socket.IO socket. */
  getSocket(): Socket {
    return this.socket
  }

  // --- Internal helpers ---

  /** Set event data and resolve any pending getEventData promises. */
  private setEventData<K extends keyof EventDataStore>(event: K, data: EventDataStore[K]): void {
    this.eventData[event] = data
    this.resolvePending(event as string)
  }

  /** Resolve all pending promises for a given event. */
  private resolvePending(event: string): void {
    const resolvers = this.pendingResolvers.get(event)
    if (resolvers) {
      for (const { resolve, timer } of resolvers) {
        clearTimeout(timer)
        resolve(this.eventData[event as keyof EventDataStore])
      }
      this.pendingResolvers.delete(event)
    }
  }

  /** Remove a specific pending resolver (used on timeout to avoid resolving stale promises). */
  private removePendingResolver(event: string, resolve: (value: unknown) => void): void {
    const resolvers = this.pendingResolvers.get(event)
    if (resolvers) {
      const idx = resolvers.findIndex((r) => r.resolve === resolve)
      if (idx >= 0) resolvers.splice(idx, 1)
      if (resolvers.length === 0) this.pendingResolvers.delete(event)
    }
  }

  private registerEventHandlers(): void {
    // --- Simple cache events (set + resolve) ---

    this.socket.on(Event.MONITOR_LIST, (data) => {
      this.setEventData(Event.MONITOR_LIST, data)
    })
    this.socket.on(Event.NOTIFICATION_LIST, (data) => {
      this.setEventData(Event.NOTIFICATION_LIST, data)
    })
    this.socket.on(Event.PROXY_LIST, (data) => {
      this.setEventData(Event.PROXY_LIST, data)
    })
    this.socket.on(Event.STATUS_PAGE_LIST, (data) => {
      this.setEventData(Event.STATUS_PAGE_LIST, data)
    })
    this.socket.on(Event.DOCKER_HOST_LIST, (data) => {
      this.setEventData(Event.DOCKER_HOST_LIST, data)
    })
    this.socket.on(Event.MAINTENANCE_LIST, (data) => {
      this.setEventData(Event.MAINTENANCE_LIST, data)
    })
    this.socket.on(Event.API_KEY_LIST, (data) => {
      this.setEventData(Event.API_KEY_LIST, data)
    })
    this.socket.on(Event.AUTO_LOGIN, () => {
      this.setEventData(Event.AUTO_LOGIN, true)
    })

    // --- Complex cache events (transform then resolve) ---

    this.socket.on(Event.HEARTBEAT_LIST, (monitorId, data, overwrite) => {
      const id = Number(monitorId)
      if (this.eventData[Event.HEARTBEAT_LIST] === null) {
        this.eventData[Event.HEARTBEAT_LIST] = {}
      }
      const store = this.eventData[Event.HEARTBEAT_LIST]!
      if (!(id in store) || overwrite) {
        store[id] = data
      } else {
        store[id]!.push(...data)
      }
      this.resolvePending(Event.HEARTBEAT_LIST)
    })
    this.socket.on(Event.IMPORTANT_HEARTBEAT_LIST, (monitorId, data, overwrite) => {
      const id = Number(monitorId)
      if (this.eventData[Event.IMPORTANT_HEARTBEAT_LIST] === null) {
        this.eventData[Event.IMPORTANT_HEARTBEAT_LIST] = {}
      }
      const store = this.eventData[Event.IMPORTANT_HEARTBEAT_LIST]!
      if (!(id in store) || overwrite) {
        store[id] = data
      } else {
        store[id]!.push(...data)
      }
      this.resolvePending(Event.IMPORTANT_HEARTBEAT_LIST)
    })
    this.socket.on(Event.AVG_PING, (monitorId, data) => {
      const id = Number(monitorId)
      if (this.eventData[Event.AVG_PING] === null) {
        this.eventData[Event.AVG_PING] = {}
      }
      this.eventData[Event.AVG_PING]![id] = data
      this.resolvePending(Event.AVG_PING)
    })
    this.socket.on(Event.UPTIME, (monitorId, type, data) => {
      const id = Number(monitorId)
      if (this.eventData[Event.UPTIME] === null) {
        this.eventData[Event.UPTIME] = {}
      }
      if (!(id in this.eventData[Event.UPTIME]!)) {
        this.eventData[Event.UPTIME]![id] = {}
      }
      this.eventData[Event.UPTIME]![id]![type] = data
      this.resolvePending(Event.UPTIME)
    })
    this.socket.on(Event.HEARTBEAT, (data) => {
      const monitorId = data.monitorID as number
      if (this.eventData[Event.HEARTBEAT_LIST] === null) {
        this.eventData[Event.HEARTBEAT_LIST] = {}
      }
      const store = this.eventData[Event.HEARTBEAT_LIST]!
      if (!(monitorId in store)) {
        store[monitorId] = []
      }
      const beats = store[monitorId]!
      beats.push(data)
      if (beats.length >= 150) {
        beats.shift()
      }
      if (data.important) {
        if (this.eventData[Event.IMPORTANT_HEARTBEAT_LIST] === null) {
          this.eventData[Event.IMPORTANT_HEARTBEAT_LIST] = {}
        }
        const importantStore = this.eventData[Event.IMPORTANT_HEARTBEAT_LIST]!
        if (!(monitorId in importantStore)) {
          importantStore[monitorId] = []
        }
        importantStore[monitorId]!.unshift(data)
      }
    })
    this.socket.on(Event.INFO, (data) => {
      if ('version' in data) {
        this.setEventData(Event.INFO, data)
      }
    })
    this.socket.on(Event.CERT_INFO, (monitorId, data) => {
      const id = Number(monitorId)
      if (this.eventData[Event.CERT_INFO] === null) {
        this.eventData[Event.CERT_INFO] = {}
      }
      try {
        this.eventData[Event.CERT_INFO]![id] = JSON.parse(data)
      } catch {
        this.eventData[Event.CERT_INFO]![id] = data
      }
      this.resolvePending(Event.CERT_INFO)
    })
  }
}
