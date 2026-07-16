/**
 * Error hierarchy for Uptime Kuma API operations.
 */

export class UptimeKumaError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'UptimeKumaError'
  }
}

export class Timeout extends UptimeKumaError {
  constructor(message: string) {
    super(message, 'TIMEOUT')
    this.name = 'Timeout'
  }
}

export class ConnectionError extends UptimeKumaError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR')
    this.name = 'ConnectionError'
  }
}

export class AuthenticationError extends UptimeKumaError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}
