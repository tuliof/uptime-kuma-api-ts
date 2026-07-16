import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type { Maintenance, MaintenanceConfig } from '../types/maintenance'

/**
 * Sub-client for maintenance window operations (CRUD, pause/resume, associations).
 */
export class MaintenanceClient {
  constructor(private readonly socket: SocketWrapper) {}

  async list(): Promise<Maintenance[]> {
    const data = await this.socket.getEventData('maintenanceList')
    return Object.values(data) as Maintenance[]
  }

  async get(id: number): Promise<Maintenance> {
    return this.socket.emitWithAck<Maintenance>('getMaintenance', id)
  }

  async add(input: MaintenanceConfig): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addMaintenance',
      input,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to add maintenance: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async edit(
    id: number,
    input: Partial<MaintenanceConfig>,
  ): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'editMaintenance',
      id,
      input,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to edit maintenance ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async delete(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'deleteMaintenance',
      id,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to delete maintenance ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async pause(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('pauseMaintenance', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to pause maintenance ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async resume(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'resumeMaintenance',
      id,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to resume maintenance ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async getMonitors(id: number): Promise<unknown[]> {
    const res = await this.socket.emitWithAck<{ monitors?: unknown[] }>('getMonitorMaintenance', id)
    return res.monitors ?? []
  }

  async addMonitors(id: number, monitors: number[]): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addMonitorMaintenance',
      id,
      monitors,
    )
    if (!res.ok) {
      throw new UptimeKumaError(
        `Failed to add monitors to maintenance ${id}: ${res.msg ?? 'Unknown error'}`,
      )
    }
    return res
  }

  async getStatusPages(id: number): Promise<unknown[]> {
    const res = await this.socket.emitWithAck<{ statusPages?: unknown[] }>(
      'getMaintenanceStatusPage',
      id,
    )
    return res.statusPages ?? []
  }

  async addStatusPages(id: number, statusPages: number[]): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addMaintenanceStatusPage',
      id,
      statusPages,
    )
    if (!res.ok) {
      throw new UptimeKumaError(
        `Failed to add status pages to maintenance ${id}: ${res.msg ?? 'Unknown error'}`,
      )
    }
    return res
  }
}
