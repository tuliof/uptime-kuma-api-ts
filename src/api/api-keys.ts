import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type { AddApiKeyInput, ApiKey } from '../types/api-key'

/**
 * Sub-client for API key operations (CRUD, enable/disable).
 */
export class ApiKeysClient {
  constructor(private readonly socket: SocketWrapper) {}

  async list(): Promise<ApiKey[]> {
    const data = await this.socket.getEventData('apiKeyList')
    return Object.values(data) as ApiKey[]
  }

  async get(id: number): Promise<ApiKey | undefined> {
    const keys = await this.list()
    return keys.find((k) => k.id === id)
  }

  async add(input: AddApiKeyInput): Promise<{ ok: boolean; msg?: string; key?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string; key?: string }>(
      'addAPIKey',
      input,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to add API key: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async enable(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('enableAPIKey', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to enable API key ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async disable(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('disableAPIKey', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to disable API key ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async delete(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('deleteAPIKey', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to delete API key ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }
}
