import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'

interface DatabaseSize {
  size: number
  unit?: string
}

/**
 * Sub-client for database operations (size, shrink).
 */
export class DatabaseClient {
  constructor(private readonly socket: SocketWrapper) {}

  async getSize(): Promise<DatabaseSize> {
    return this.socket.emitWithAck<DatabaseSize>('getDatabaseSize')
  }

  async shrink(): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('shrinkDatabase')
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to shrink database: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }
}
