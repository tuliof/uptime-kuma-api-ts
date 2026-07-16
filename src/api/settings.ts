import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type { Settings } from '../types/settings'

/**
 * Sub-client for server settings operations.
 */
export class SettingsClient {
  constructor(private readonly socket: SocketWrapper) {}

  async get(): Promise<Settings> {
    return this.socket.emitWithAck<Settings>('getSettings')
  }

  async set(input: Partial<Settings>): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('setSettings', input)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to set settings: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'changePassword',
      oldPassword,
      newPassword,
    )
    if (!res.ok) {
      throw new UptimeKumaError('Failed to change password')
    }
    return res
  }

  async uploadBackup(
    jsonData: string,
    importHandle: string = 'skip',
  ): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'uploadBackup',
      jsonData,
      importHandle,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Backup upload failed: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async clearStatistics(): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('clearStatistics')
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to clear statistics: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }
}
