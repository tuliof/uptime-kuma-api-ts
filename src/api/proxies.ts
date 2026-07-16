import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type { ProxyConfig, Proxy as ProxyType } from '../types/proxy'

/**
 * Sub-client for proxy operations (CRUD).
 */
export class ProxiesClient {
  constructor(private readonly socket: SocketWrapper) {}

  async list(): Promise<ProxyType[]> {
    const data = await this.socket.getEventData('proxyList')
    return Object.values(data) as ProxyType[]
  }

  async get(id: number): Promise<ProxyType | undefined> {
    const proxies = await this.list()
    return proxies.find((p) => p.id === id)
  }

  async add(input: ProxyConfig): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addProxy',
      input,
      null,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to add proxy: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async edit(id: number, input: Partial<ProxyConfig>): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('addProxy', input, id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to edit proxy ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async delete(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('deleteProxy', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to delete proxy ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }
}
