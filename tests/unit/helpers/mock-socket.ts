import type { Socket } from 'socket.io-client'

import { SocketWrapper } from '../../../src/socket'

type EventHandler = (...args: unknown[]) => void

/**
 * Minimal mock of a Socket.IO Socket.
 * Captures emit calls and their ack callbacks, and allows
 * simulating incoming events via `simulateEvent`.
 */
export class MockSocket {
  connected = false
  private handlers = new Map<string, Set<EventHandler>>()
  private emitQueue: Array<{
    event: string
    args: unknown[]
    ackIndex: number
  }> = []

  /** Registered event handlers — keyed by event name. */
  emit(event: string, ...args: unknown[]): Socket {
    // The last argument may be an ack callback (function)
    const ackIndex = args.length - 1
    const hasAck = typeof args[ackIndex] === 'function'

    if (hasAck) {
      this.emitQueue.push({ event, args, ackIndex })
    } else {
      this.emitQueue.push({ event, args: [...args], ackIndex: -1 })
    }
    return this as unknown as Socket
  }

  on(event: string, handler: EventHandler): Socket {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
    return this as unknown as Socket
  }

  off(event: string, handler?: EventHandler): Socket {
    if (handler) {
      this.handlers.get(event)?.delete(handler)
    } else {
      this.handlers.delete(event)
    }
    return this as unknown as Socket
  }

  disconnect(): Socket {
    this.connected = false
    this.simulateEvent('disconnect')
    return this as unknown as Socket
  }

  removeAllListeners(_event?: string): Socket {
    if (_event) {
      this.handlers.delete(_event)
    } else {
      this.handlers.clear()
    }
    return this as unknown as Socket
  }

  // --- Test helpers ---

  /** Simulate an incoming event — calls all registered handlers for that event. */
  simulateEvent(event: string, ...args: unknown[]): void {
    const set = this.handlers.get(event)
    if (set) {
      for (const handler of set) {
        handler(...args)
      }
    }
  }

  /**
   * Resolve the most recent emit call by invoking its ack callback.
   * If no ack callback was provided, this is a no-op.
   */
  ackLast(response: unknown): void {
    const last = this.emitQueue[this.emitQueue.length - 1]
    if (!last || last.ackIndex < 0) return
    const cb = last.args[last.ackIndex] as (response: unknown) => void
    cb(response)
  }

  /** Resolve a specific emit call (by index in the queue) via its ack callback. */
  ack(index: number, response: unknown): void {
    const call = this.emitQueue[index]
    if (!call || call.ackIndex < 0) return
    const cb = call.args[call.ackIndex] as (response: unknown) => void
    cb(response)
  }

  /** Get the Nth emit call (0-indexed). */
  getEmit(index: number): { event: string; args: unknown[] } {
    const call = this.emitQueue[index]!
    // Return args without the ack callback
    const args = call.ackIndex >= 0 ? call.args.slice(0, call.ackIndex) : call.args
    return { event: call.event, args }
  }

  /** Total number of emit calls. */
  get emitCount(): number {
    return this.emitQueue.length
  }

  /** All emit events (names only, in order). */
  get emittedEvents(): string[] {
    return this.emitQueue.map((c) => c.event)
  }

  /** Reset the mock state (handlers, emit queue, connected flag). */
  reset(): void {
    this.handlers.clear()
    this.emitQueue = []
    this.connected = false
  }

  /** Connect the mock socket — fires the 'connect' event. */
  simulateConnect(): void {
    this.connected = true
    this.simulateEvent('connect')
  }

  /** Fire the connect_error event. */
  simulateConnectError(message: string): void {
    this.simulateEvent('connect_error', { message })
  }
}

/**
 * Create a MockSocket wrapped in a real SocketWrapper.
 * The SocketWrapper registers its event handlers on the mock,
 * so simulateEvent() will populate the cached event data.
 */
export function createMockSocketWrapper(timeout = 1000): {
  mock: MockSocket
  wrapper: SocketWrapper
} {
  const mock = new MockSocket()
  mock.connected = true
  const wrapper = new SocketWrapper(mock as unknown as Socket, timeout)
  return { mock, wrapper }
}
