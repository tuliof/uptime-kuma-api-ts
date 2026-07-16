import { ZodError } from 'zod'
import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type {
  AddMonitorInput,
  EditMonitorInput,
  Heartbeat,
  Monitor,
  MonitorStatus,
} from '../types/monitor'
import { AddMonitorInputSchema } from '../types/monitor'

/**
 * Sub-client for monitor operations (CRUD, pause/resume, beats, tags, clear).
 */
export class MonitorsClient {
  constructor(private readonly socket: SocketWrapper) {}

  async get(id: number): Promise<Monitor> {
    const res = await this.socket.emitWithAck<{ ok: boolean; monitor?: Monitor; msg?: string }>(
      'getMonitor',
      id,
    )
    if (!res.ok || !res.monitor) {
      throw new UptimeKumaError(`Failed to get monitor ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res.monitor
  }

  async list(): Promise<Monitor[]> {
    const data = await this.socket.getEventData('monitorList')
    return Object.values(data) as Monitor[]
  }

  async add(input: AddMonitorInput): Promise<{ msg: string; monitorID: number }> {
    let parsed: AddMonitorInput
    try {
      parsed = AddMonitorInputSchema.parse(input)
    } catch (err) {
      const message =
        err instanceof ZodError ? err.issues.map((e) => e.message).join('; ') : String(err)
      throw new UptimeKumaError(`Invalid monitor config: ${message}`)
    }

    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string; monitorID?: number }>(
      'add',
      parsed,
    )
    if (!res.ok || !res.monitorID) {
      throw new UptimeKumaError(`Failed to add monitor: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Added Successfully.', monitorID: res.monitorID }
  }

  async edit(
    id: number,
    input: Partial<EditMonitorInput>,
  ): Promise<{ msg: string; monitorID: number }> {
    const existing = await this.get(id)
    const merged = { ...existing, ...input, id }
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string; monitorID?: number }>(
      'editMonitor',
      merged,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to edit monitor ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Saved.', monitorID: id }
  }

  async delete(id: number): Promise<{ msg: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('deleteMonitor', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to delete monitor ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Deleted Successfully.' }
  }

  async pause(id: number): Promise<{ msg: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('pauseMonitor', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to pause monitor ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Paused Successfully.' }
  }

  async resume(id: number): Promise<{ msg: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('resumeMonitor', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to resume monitor ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Resumed Successfully.' }
  }

  async getBeats(id: number, hours: number): Promise<Heartbeat[]> {
    const res = await this.socket.emitWithAck<{ ok: boolean; data?: Heartbeat[]; msg?: string }>(
      'getMonitorBeats',
      id,
      hours,
    )
    if (!res.ok || !res.data) {
      throw new UptimeKumaError(
        `Failed to get beats for monitor ${id}: ${res.msg ?? 'Unknown error'}`,
      )
    }
    return res.data
  }

  async getGameList(): Promise<unknown[]> {
    const res = await this.socket.emitWithAck<{ gameList?: unknown[] }>('getGameList')
    return res.gameList ?? []
  }

  async testChrome(executable: string): Promise<{ msg: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'testChrome',
      executable,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Chrome test failed: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? '' }
  }

  async getStatus(monitorId: number): Promise<MonitorStatus> {
    const heartbeats = await this.socket.getCachedEventData('heartbeatList')
    if (!heartbeats || !(monitorId in heartbeats)) {
      return 'pending'
    }
    const beats = heartbeats[monitorId]
    if (!beats || beats.length === 0) return 'pending'
    const latest = beats[0] as { status: number }
    const statusMap: Record<number, MonitorStatus> = {
      0: 'down',
      1: 'up',
      2: 'pending',
      3: 'maintenance',
    }
    return statusMap[latest.status] ?? 'pending'
  }

  async addTag(tagId: number, monitorId: number, value: string = ''): Promise<{ msg: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addMonitorTag',
      tagId,
      monitorId,
      value,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to add tag: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Added Successfully.' }
  }

  async deleteTag(tagId: number, monitorId: number, value: string = ''): Promise<{ msg: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'deleteMonitorTag',
      tagId,
      monitorId,
      value,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to delete tag: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Deleted Successfully.' }
  }

  async clearEvents(id: number): Promise<{ msg: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('clearEvents', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to clear events: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Cleared Successfully.' }
  }

  async clearHeartbeats(id: number): Promise<{ msg: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('clearHeartbeats', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to clear heartbeats: ${res.msg ?? 'Unknown error'}`)
    }
    return { msg: res.msg ?? 'Cleared Successfully.' }
  }
}
