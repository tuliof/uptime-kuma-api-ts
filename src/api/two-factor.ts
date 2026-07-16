import { UptimeKumaError } from '../errors'
import type { SocketWrapper } from '../socket'

/**
 * Two-factor authentication response types.
 */
interface TwoFAStatus {
  ok: boolean
  status: boolean
}

interface Prepare2FAResponse {
  ok: boolean
  url?: string
  secret?: string
  msg?: string
}

interface VerifyTokenResponse {
  ok: boolean
  msg?: string
}

/**
 * Sub-client for two-factor authentication operations.
 */
export class TwoFactorClient {
  constructor(private readonly socket: SocketWrapper) {}

  async status(): Promise<TwoFAStatus> {
    return this.socket.emitWithAck<TwoFAStatus>('twoFAStatus')
  }

  async prepare(password: string): Promise<Prepare2FAResponse> {
    const res = await this.socket.emitWithAck<Prepare2FAResponse>('prepare2FA', password)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to prepare 2FA: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async verifyToken(token: string, password: string): Promise<VerifyTokenResponse> {
    const res = await this.socket.emitWithAck<VerifyTokenResponse>('verifyToken', token, password)
    if (!res.ok) {
      throw new UptimeKumaError(`Token verification failed: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async save(password: string): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('save2FA', password)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to save 2FA: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }

  async disable(password: string): Promise<{ ok: boolean; msg?: string }> {
    const res = await this.socket.emitWithAck<{ ok: boolean; msg?: string }>('disable2FA', password)
    if (!res.ok) {
      throw new UptimeKumaError(`Failed to disable 2FA: ${res.msg ?? 'Unknown error'}`)
    }
    return res
  }
}
