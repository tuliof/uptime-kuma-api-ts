import { z } from 'zod'

/**
 * Authentication methods for HTTP-based monitors.
 *
 * - `''` (empty string): No authentication
 * - `'basic'`: HTTP Basic Authentication
 * - `'ntlm'`: NTLM Windows Authentication
 * - `'mtls'`: Mutual TLS (client certificate)
 * - `'oauth2-cc'`: OAuth 2.0 Client Credentials flow
 */
export const AuthMethodSchema = z.enum(['', 'basic', 'ntlm', 'mtls', 'oauth2-cc'])

export type AuthMethod = z.infer<typeof AuthMethodSchema>

/** Named constants for auth methods. Use these instead of raw strings. */
export const AUTH_METHOD = {
  NONE: '',
  HTTP_BASIC: 'basic',
  NTLM: 'ntlm',
  MTLS: 'mtls',
  OAUTH2_CC: 'oauth2-cc',
} as const
