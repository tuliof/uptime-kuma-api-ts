import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type { DockerHost, DockerHostConfig } from '../types/docker'

/**
 * Sub-client for docker host operations (CRUD, test).
 */
export class DockerHostsClient {
  constructor(private readonly socket: SocketWrapper) {}

  async list(): Promise<DockerHost[]> {
    const data = await this.socket.getEventData('dockerHostList')
    return Object.values(data) as DockerHost[]
  }

  async get(id: number): Promise<DockerHost | undefined> {
    const hosts = await this.list()
    return hosts.find((h) => h.id === id)
  }

  async test(input: DockerHostConfig): Promise<{ ok: boolean; msg?: string }> {
    return this.socket.emitWithAck<{ ok: boolean; msg?: string }>('testDockerHost', input)
  }

  async add(input: DockerHostConfig): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addDockerHost',
      input,
      null,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to add docker host: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async edit(id: number, input: Partial<DockerHostConfig>): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addDockerHost',
      input,
      id,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to edit docker host ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async delete(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('deleteDockerHost', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to delete docker host ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }
}
