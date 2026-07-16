import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type { AddTagInput, EditTagInput, Tag } from '../types/monitor'

/**
 * Sub-client for tag operations (CRUD).
 */
export class TagsClient {
  constructor(private readonly socket: SocketWrapper) {}

  async list(): Promise<Tag[]> {
    const res = await this.socket.emitWithAck<{ tags?: Tag[] }>('getTags')
    return res.tags ?? []
  }

  async get(id: number): Promise<Tag | undefined> {
    const tags = await this.list()
    return tags.find((t) => t.id === id)
  }

  async add(input: AddTagInput): Promise<{ ok: boolean; id?: number }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; id?: number; msg?: string }>(
      'addTag',
      { new: true, ...input },
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to add tag: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async edit(id: number, input: EditTagInput): Promise<{ ok: boolean }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('editTag', {
      id,
      ...input,
    })
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to edit tag ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return { ok: true }
  }

  async delete(id: number): Promise<{ ok: boolean }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('deleteTag', id)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to delete tag ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return { ok: true }
  }
}
