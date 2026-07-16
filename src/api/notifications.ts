import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'
import type { Notification, NotificationConfig } from '../types/notification'

/**
 * Sub-client for notification operations (CRUD, test, checkApprise).
 */
export class NotificationsClient {
  constructor(private readonly socket: SocketWrapper) {}

  async list(): Promise<Notification[]> {
    const data = await this.socket.getEventData('notificationList')
    return Object.values(data) as Notification[]
  }

  async get(id: number): Promise<Notification | undefined> {
    const notifications = await this.list()
    return notifications.find((n) => n.id === id)
  }

  async test(input: Partial<NotificationConfig>): Promise<{ ok: boolean; msg?: string }> {
    return this.socket.emitWithAck<{ ok: boolean; msg?: string }>('testNotification', input)
  }

  async add(input: NotificationConfig): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addNotification',
      input,
      null,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to add notification: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async edit(
    id: number,
    input: Partial<NotificationConfig>,
  ): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'addNotification',
      input,
      id,
    )
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to edit notification ${id}: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async delete(id: number): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>(
      'deleteNotification',
      id,
    )
    if (!res.ok) {
      throw new UptimeKumaError(
        `Failed to delete notification ${id}: ${res.msg ?? 'Unknown error'}`,
      )
    }
    return res
  }

  async checkApprise(): Promise<boolean> {
    const res = await this.socket.emitWithAck<{ ok: boolean }>('checkApprise')
    return res.ok
  }
}
