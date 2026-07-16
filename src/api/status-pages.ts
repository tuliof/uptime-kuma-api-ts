import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type { Incident, StatusPageConfig } from '../types/status-page'

/**
 * Sub-client for status page operations (CRUD, save, incidents).
 * Uses both Socket.IO and REST (fetch) for status page config.
 */
export class StatusPagesClient {
  constructor(
    private readonly socket: SocketWrapper,
    // biome-ignore lint/correctness/noUnusedPrivateClassMembers: used in Phase 5 for REST fetches
    private readonly url: string,
  ) {}

  async list(): Promise<StatusPageConfig[]> {
    const data = await this.socket.getEventData('statusPageList')
    return Object.values(data) as StatusPageConfig[]
  }

  async get(slug: string): Promise<StatusPageConfig> {
    return this.socket.emitWithAck<StatusPageConfig>('getStatusPage', slug)
  }

  async add(slug: string, title: string): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addStatusPage',
      title,
      slug,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to add status page: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async delete(slug: string): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'deleteStatusPage',
      slug,
    )
    if (!res.ok) {
      throw new UptimeKumaError(
        `Failed to delete status page ${slug}: ${res.msg ?? 'Unknown error'}`,
      )
    }
    return res
  }

  async save(
    slug: string,
    input: Partial<StatusPageConfig>,
  ): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'saveStatusPage',
      slug,
      input,
      null,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to save status page ${slug}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async postIncident(slug: string, input: Incident): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'postIncident',
      slug,
      input,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to post incident: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async unpinIncident(slug: string): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('unpinIncident', slug)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to unpin incident: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }
}
