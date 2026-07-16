import { describe, expect, test } from 'bun:test'

import { UptimeKumaApi } from '../../src/client'
import { SilentLogger } from '../../src/logger'
import { MonitorTypeSchema } from '../../src/types/monitor'

describe('smoke test', () => {
  test('UptimeKumaApi can be instantiated', () => {
    const api = new UptimeKumaApi({ url: 'http://localhost:3001' })
    expect(api).toBeDefined()
    expect(api).toBeInstanceOf(UptimeKumaApi)
  })

  test('SilentLogger is silent', () => {
    const logger = new SilentLogger()
    expect(logger).toBeDefined()
    // Should not throw
    logger.debug('test')
    logger.info('test')
    logger.warn('test')
    logger.error('test')
  })

  test('MonitorTypeSchema validates known types', () => {
    expect(MonitorTypeSchema.safeParse('http').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('port').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('ping').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('keyword').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('json-query').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('grpc-keyword').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('dns').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('docker').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('real-browser').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('push').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('steam').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('gamedig').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('mqtt').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('kafka-producer').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('sqlserver').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('postgres').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('mysql').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('mongodb').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('radius').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('redis').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('group').success).toBe(true)
    expect(MonitorTypeSchema.safeParse('tailscale-ping').success).toBe(true)
  })

  test('MonitorTypeSchema rejects unknown types', () => {
    expect(MonitorTypeSchema.safeParse('unknown').success).toBe(false)
    expect(MonitorTypeSchema.safeParse('').success).toBe(false)
    expect(MonitorTypeSchema.safeParse(123).success).toBe(false)
  })
})
