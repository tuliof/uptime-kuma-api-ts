import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import {
  ConsoleLogger,
  createLogger,
  type LogContext,
  type Logger,
  SilentLogger,
} from '../../src/logger'

describe('SilentLogger', () => {
  test('implements Logger interface', () => {
    const logger: Logger = new SilentLogger()
    expect(logger).toBeDefined()
  })

  test('all methods are no-ops that do not throw', () => {
    const logger = new SilentLogger()
    const ctx: LogContext = { key: 'value' }

    expect(() => {
      logger.debug('msg', ctx)
      logger.info('msg', ctx)
      logger.warn('msg', ctx)
      logger.error('msg', ctx)
      logger.debug('msg')
      logger.info('msg')
      logger.warn('msg')
      logger.error('msg')
    }).not.toThrow()
  })

  test('does not write to console', () => {
    const debugSpy = mock(() => {})
    const infoSpy = mock(() => {})
    const warnSpy = mock(() => {})
    const errorSpy = mock(() => {})

    const origDebug = console.debug
    const origInfo = console.info
    const origWarn = console.warn
    const origError = console.error

    console.debug = debugSpy as unknown as typeof console.debug
    console.info = infoSpy as unknown as typeof console.info
    console.warn = warnSpy as unknown as typeof console.warn
    console.error = errorSpy as unknown as typeof console.error

    try {
      const logger = new SilentLogger()
      logger.debug('hidden')
      logger.info('hidden')
      logger.warn('hidden')
      logger.error('hidden')

      expect(debugSpy).toHaveBeenCalledTimes(0)
      expect(infoSpy).toHaveBeenCalledTimes(0)
      expect(warnSpy).toHaveBeenCalledTimes(0)
      expect(errorSpy).toHaveBeenCalledTimes(0)
    } finally {
      console.debug = origDebug
      console.info = origInfo
      console.warn = origWarn
      console.error = origError
    }
  })
})

describe('ConsoleLogger', () => {
  let spies: {
    debug: ReturnType<typeof mock>
    info: ReturnType<typeof mock>
    warn: ReturnType<typeof mock>
    error: ReturnType<typeof mock>
  }
  let origConsole: {
    debug: typeof console.debug
    info: typeof console.info
    warn: typeof console.warn
    error: typeof console.error
  }

  beforeEach(() => {
    spies = {
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    }
    origConsole = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }
    console.debug = spies.debug as unknown as typeof console.debug
    console.info = spies.info as unknown as typeof console.info
    console.warn = spies.warn as unknown as typeof console.warn
    console.error = spies.error as unknown as typeof console.error
  })

  afterEach(() => {
    console.debug = origConsole.debug
    console.info = origConsole.info
    console.warn = origConsole.warn
    console.error = origConsole.error
  })

  test('default level is info', () => {
    const logger = new ConsoleLogger()
    logger.info('hello')
    logger.debug('hidden')

    expect(spies.info).toHaveBeenCalledTimes(1)
    expect(spies.debug).toHaveBeenCalledTimes(0)
  })

  test('debug level shows all', () => {
    const logger = new ConsoleLogger('debug')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(spies.debug).toHaveBeenCalledTimes(1)
    expect(spies.info).toHaveBeenCalledTimes(1)
    expect(spies.warn).toHaveBeenCalledTimes(1)
    expect(spies.error).toHaveBeenCalledTimes(1)
  })

  test('info level hides debug', () => {
    const logger = new ConsoleLogger('info')
    logger.debug('hidden')
    logger.info('shown')
    logger.warn('shown')
    logger.error('shown')

    expect(spies.debug).toHaveBeenCalledTimes(0)
    expect(spies.info).toHaveBeenCalledTimes(1)
    expect(spies.warn).toHaveBeenCalledTimes(1)
    expect(spies.error).toHaveBeenCalledTimes(1)
  })

  test('warn level hides debug and info', () => {
    const logger = new ConsoleLogger('warn')
    logger.debug('hidden')
    logger.info('hidden')
    logger.warn('shown')
    logger.error('shown')

    expect(spies.debug).toHaveBeenCalledTimes(0)
    expect(spies.info).toHaveBeenCalledTimes(0)
    expect(spies.warn).toHaveBeenCalledTimes(1)
    expect(spies.error).toHaveBeenCalledTimes(1)
  })

  test('error level only shows errors', () => {
    const logger = new ConsoleLogger('error')
    logger.debug('hidden')
    logger.info('hidden')
    logger.warn('hidden')
    logger.error('shown')

    expect(spies.debug).toHaveBeenCalledTimes(0)
    expect(spies.info).toHaveBeenCalledTimes(0)
    expect(spies.warn).toHaveBeenCalledTimes(0)
    expect(spies.error).toHaveBeenCalledTimes(1)
  })

  test('none level shows nothing', () => {
    const logger = new ConsoleLogger('none')
    logger.debug('hidden')
    logger.info('hidden')
    logger.warn('hidden')
    logger.error('hidden')

    expect(spies.debug).toHaveBeenCalledTimes(0)
    expect(spies.info).toHaveBeenCalledTimes(0)
    expect(spies.warn).toHaveBeenCalledTimes(0)
    expect(spies.error).toHaveBeenCalledTimes(0)
  })

  test('setLevel changes the threshold at runtime', () => {
    const logger = new ConsoleLogger('error')
    logger.info('hidden')
    expect(spies.info).toHaveBeenCalledTimes(0)

    logger.setLevel('debug')
    logger.info('shown')
    expect(spies.info).toHaveBeenCalledTimes(1)
  })

  test('formats message without context', () => {
    const logger = new ConsoleLogger('debug')
    logger.info('plain')
    expect(spies.info).toHaveBeenCalledWith('[INFO] plain')
  })

  test('formats message with context as JSON', () => {
    const logger = new ConsoleLogger('debug')
    logger.info('with ctx', { user: 'admin', count: 3 })
    expect(spies.info).toHaveBeenCalledWith('[INFO] with ctx {"user":"admin","count":3}')
  })

  test('formats message with empty context object as plain', () => {
    const logger = new ConsoleLogger('debug')
    logger.info('empty ctx', {})
    expect(spies.info).toHaveBeenCalledWith('[INFO] empty ctx')
  })

  test('uses correct console method per level', () => {
    const logger = new ConsoleLogger('debug')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')

    expect(spies.debug).toHaveBeenCalledWith('[DEBUG] d')
    expect(spies.info).toHaveBeenCalledWith('[INFO] i')
    expect(spies.warn).toHaveBeenCalledWith('[WARN] w')
    expect(spies.error).toHaveBeenCalledWith('[ERROR] e')
  })
})

describe('createLogger', () => {
  test('returns SilentLogger for undefined', () => {
    const logger = createLogger(undefined)
    expect(logger).toBeInstanceOf(SilentLogger)
  })

  test('returns SilentLogger for "none"', () => {
    const logger = createLogger('none')
    expect(logger).toBeInstanceOf(SilentLogger)
  })

  test('returns ConsoleLogger for "debug"', () => {
    const logger = createLogger('debug')
    expect(logger).toBeInstanceOf(ConsoleLogger)
  })

  test('returns ConsoleLogger for "info"', () => {
    const logger = createLogger('info')
    expect(logger).toBeInstanceOf(ConsoleLogger)
  })

  test('returns ConsoleLogger for "warn"', () => {
    const logger = createLogger('warn')
    expect(logger).toBeInstanceOf(ConsoleLogger)
  })

  test('returns ConsoleLogger for "error"', () => {
    const logger = createLogger('error')
    expect(logger).toBeInstanceOf(ConsoleLogger)
  })

  test('default logger is silent (no output)', () => {
    const debugSpy = mock(() => {})
    const origDebug = console.debug
    console.debug = debugSpy as unknown as typeof console.debug

    try {
      const logger = createLogger()
      logger.debug('invisible')
      expect(debugSpy).toHaveBeenCalledTimes(0)
    } finally {
      console.debug = origDebug
    }
  })
})
