import { describe, expect, test } from 'bun:test'

import { AuthenticationError, ConnectionError, Timeout, UptimeKumaError } from '../../src/errors'

describe('UptimeKumaError', () => {
  test('is an Error subclass', () => {
    const err = new UptimeKumaError('something went wrong')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(UptimeKumaError)
  })

  test('sets message and name', () => {
    const err = new UptimeKumaError('boom')
    expect(err.message).toBe('boom')
    expect(err.name).toBe('UptimeKumaError')
  })

  test('accepts an optional code', () => {
    const withCode = new UptimeKumaError('fail', 'CUSTOM_CODE')
    expect(withCode.code).toBe('CUSTOM_CODE')
  })

  test('code is undefined when not provided', () => {
    const err = new UptimeKumaError('fail')
    expect(err.code).toBeUndefined()
  })
})

describe('Timeout', () => {
  test('extends UptimeKumaError', () => {
    const err = new Timeout('timed out')
    expect(err).toBeInstanceOf(UptimeKumaError)
    expect(err).toBeInstanceOf(Timeout)
  })

  test('sets code to TIMEOUT', () => {
    const err = new Timeout('timed out')
    expect(err.code).toBe('TIMEOUT')
  })

  test('sets name to Timeout', () => {
    const err = new Timeout('timed out')
    expect(err.name).toBe('Timeout')
  })

  test('preserves message', () => {
    const err = new Timeout('waited 10s')
    expect(err.message).toBe('waited 10s')
  })
})

describe('ConnectionError', () => {
  test('extends UptimeKumaError', () => {
    const err = new ConnectionError('cannot connect')
    expect(err).toBeInstanceOf(UptimeKumaError)
    expect(err).toBeInstanceOf(ConnectionError)
  })

  test('sets code to CONNECTION_ERROR', () => {
    const err = new ConnectionError('cannot connect')
    expect(err.code).toBe('CONNECTION_ERROR')
  })

  test('sets name to ConnectionError', () => {
    const err = new ConnectionError('cannot connect')
    expect(err.name).toBe('ConnectionError')
  })
})

describe('AuthenticationError', () => {
  test('extends UptimeKumaError', () => {
    const err = new AuthenticationError('bad creds')
    expect(err).toBeInstanceOf(UptimeKumaError)
    expect(err).toBeInstanceOf(AuthenticationError)
  })

  test('sets code to AUTHENTICATION_ERROR', () => {
    const err = new AuthenticationError('bad creds')
    expect(err.code).toBe('AUTHENTICATION_ERROR')
  })

  test('sets name to AuthenticationError', () => {
    const err = new AuthenticationError('bad creds')
    expect(err.name).toBe('AuthenticationError')
  })
})

describe('Error hierarchy', () => {
  test('all subtypes are UptimeKumaError instances', () => {
    const errors = [new Timeout('t'), new ConnectionError('c'), new AuthenticationError('a')]
    for (const err of errors) {
      expect(err).toBeInstanceOf(UptimeKumaError)
    }
  })

  test('catching UptimeKumaError catches all subtypes', () => {
    try {
      throw new Timeout('inner')
    } catch (err) {
      if (err instanceof UptimeKumaError) {
        expect(err.message).toBe('inner')
      } else {
        throw new Error('Should have been caught as UptimeKumaError')
      }
    }
  })

  test('each error type is distinct', () => {
    const timeout = new Timeout('x')
    const conn = new ConnectionError('x')
    const auth = new AuthenticationError('x')

    expect(timeout).not.toBe(conn)
    expect(timeout).not.toBe(auth)
    expect(conn).not.toBe(auth)

    // Same message but different types
    expect(timeout.name).not.toBe(conn.name)
    expect(timeout.code).not.toBe(conn.code)
  })
})
