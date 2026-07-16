import { describe, expect, test } from 'bun:test'

import {
  convertMonitorNotificationIds,
  convertMonitorNotificationIdsToDict,
  genSecret,
  intToBool,
  parseValue,
} from '../../src/utils'

describe('intToBool', () => {
  test('converts 1 to true on a single object', () => {
    const obj: Record<string, unknown> = { active: 1, name: 'monitor' }
    const result = intToBool(obj, ['active'])
    expect(result.active).toBe(true)
    // Original should be unchanged
    expect(obj.active).toBe(1)
  })

  test('converts 0 to false on a single object', () => {
    const obj: Record<string, unknown> = { active: 0, name: 'monitor' }
    const result = intToBool(obj, ['active'])
    expect(result.active).toBe(false)
  })

  test('converts true to true (passthrough)', () => {
    const obj: Record<string, unknown> = { active: true }
    const result = intToBool(obj, ['active'])
    expect(result.active).toBe(true)
  })

  test('converts false to false', () => {
    const obj: Record<string, unknown> = { active: false }
    const result = intToBool(obj, ['active'])
    expect(result.active).toBe(false)
  })

  test('handles multiple keys', () => {
    const obj: Record<string, unknown> = { active: 1, important: 1, name: 'test' }
    const result = intToBool(obj, ['active', 'important'])
    expect(result.active).toBe(true)
    expect(result.important).toBe(true)
    expect(result.name).toBe('test')
  })

  test('skips keys not present in object', () => {
    const obj: Record<string, unknown> = { name: 'test' }
    const result = intToBool(obj, ['active'])
    expect(result).toEqual({ name: 'test' })
  })

  test('works on arrays of objects', () => {
    const data: Record<string, unknown>[] = [
      { active: 1, id: 1 },
      { active: 0, id: 2 },
    ]
    const result = intToBool(data, ['active'])
    expect(result[0]!.active).toBe(true)
    expect(result[1]!.active).toBe(false)
    // Original should be unchanged
    expect(data[0]!.active).toBe(1)
  })

  test('returns primitives as-is', () => {
    const r1 = intToBool(null, ['active'])
    expect(r1).toBeNull()
    const r2 = intToBool(undefined, ['active'])
    expect(r2).toBeUndefined()
    const r3 = intToBool(42, ['active'])
    expect(r3).toBe(42)
    const r4 = intToBool('string', ['active'])
    expect(r4).toBe('string')
  })

  test('treats any truthy non-1 value as false', () => {
    const obj: Record<string, unknown> = { active: 2 }
    const result = intToBool(obj, ['active'])
    // Only 1 or true → true; anything else → false
    expect(result.active).toBe(false)
  })
})

describe('parseValue', () => {
  test('applies default when value is null', () => {
    const obj: Record<string, unknown> = { status: null }
    const result = parseValue(obj, 'status', 'string', 'default')
    expect(result).toEqual({ status: 'default' })
    // Original should be unchanged
    expect(obj.status).toBeNull()
  })

  test('applies default when value is undefined', () => {
    const obj: Record<string, unknown> = { status: undefined }
    const result = parseValue(obj, 'status', 'string', 'fallback')
    expect(result).toEqual({ status: 'fallback' })
  })

  test('returns original when value exists and no default needed', () => {
    const obj: Record<string, unknown> = { status: 'up' }
    const result = parseValue(obj, 'status', 'string')
    // Returns the same reference for unchanged objects
    expect(result).toBe(obj)
    expect(result.status).toBe('up')
  })

  test('returns original when key is absent', () => {
    const obj: Record<string, unknown> = { name: 'test' }
    const result = parseValue(obj, 'status', 'string', 'default')
    expect(result).toBe(obj)
    expect(result).toEqual({ name: 'test' })
  })

  test('returns null/undefined/falsy data as-is', () => {
    expect(parseValue(null, 'status', 'string', 'x')).toBeNull()
    expect(parseValue(undefined, 'status', 'string', 'x')).toBeUndefined()
    // Primitives without known keys are returned as-is (runtime resilience)
    const falsyResult = parseValue(0 as unknown as Record<string, unknown>, 'status', 'string', 'x')
    expect(falsyResult as unknown).toBe(0)
  })

  test('works on arrays', () => {
    const data: Record<string, unknown>[] = [{ status: null }, { status: null }]
    const result = parseValue(data, 'status', 'string', 'up')
    expect(result[0]!.status).toBe('up')
    expect(result[1]!.status).toBe('up')
    // Original should be unchanged
    expect(data[0]!.status).toBeNull()
  })

  test('does not apply default when default is undefined', () => {
    const obj: Record<string, unknown> = { status: null }
    const result = parseValue(obj, 'status', 'string')
    // When no default, returns original (unchanged)
    expect(result).toBe(obj)
    expect((result as Record<string, unknown>).status).toBeNull()
  })
})

describe('convertMonitorNotificationIds', () => {
  test('converts dict to array of numeric ids', () => {
    const monitor: Record<string, unknown> = { notificationIDList: { '1': true, '5': true } }
    const result = convertMonitorNotificationIds(monitor)
    expect(result.notificationIDList).toEqual([1, 5])
    // Original should be unchanged
    expect(monitor.notificationIDList).toEqual({ '1': true, '5': true })
  })

  test('handles empty dict', () => {
    const monitor: Record<string, unknown> = { notificationIDList: {} }
    const result = convertMonitorNotificationIds(monitor)
    expect(result.notificationIDList).toEqual([])
  })

  test('returns original when notificationIDList is already an array', () => {
    const monitor: Record<string, unknown> = { notificationIDList: [1, 2, 3] }
    const result = convertMonitorNotificationIds(monitor)
    expect(result).toBe(monitor)
    expect(result.notificationIDList).toEqual([1, 2, 3])
  })

  test('returns original when notificationIDList is null', () => {
    const monitor: Record<string, unknown> = { notificationIDList: null }
    const result = convertMonitorNotificationIds(monitor)
    expect(result).toBe(monitor)
    expect(result.notificationIDList).toBeNull()
  })

  test('returns original when notificationIDList is missing', () => {
    const monitor: Record<string, unknown> = {}
    const result = convertMonitorNotificationIds(monitor)
    expect(result).toBe(monitor)
    expect(result).toEqual({})
  })

  test('returns original when notificationIDList is a string', () => {
    const monitor = { notificationIDList: 'not-a-dict' }
    const result = convertMonitorNotificationIds(monitor)
    expect(result).toBe(monitor)
    expect(result.notificationIDList).toBe('not-a-dict')
  })
})

describe('convertMonitorNotificationIdsToDict', () => {
  test('converts array to dict with true values', () => {
    const data: Record<string, unknown> = { notificationIDList: [1, 2, 3] }
    const result = convertMonitorNotificationIdsToDict(data)
    expect(result.notificationIDList).toEqual({ 1: true, 2: true, 3: true })
    // Original should be unchanged
    expect(data.notificationIDList).toEqual([1, 2, 3])
  })

  test('converts empty array to empty dict', () => {
    const data: Record<string, unknown> = { notificationIDList: [] }
    const result = convertMonitorNotificationIdsToDict(data)
    expect(result.notificationIDList).toEqual({})
  })

  test('sets empty dict when notificationIDList is null', () => {
    const data: Record<string, unknown> = { notificationIDList: null }
    const result = convertMonitorNotificationIdsToDict(data)
    expect(result.notificationIDList).toEqual({})
  })

  test('returns original when notificationIDList is already an object dict', () => {
    const dict = { 1: true }
    const data: Record<string, unknown> = { notificationIDList: dict }
    const result = convertMonitorNotificationIdsToDict(data)
    // It's not an array and it's truthy, so no change
    expect(result).toBe(data)
    expect(result.notificationIDList).toBe(dict)
  })
})

describe('genSecret', () => {
  test('generates a string of the specified length', () => {
    const secret = genSecret(10)
    expect(typeof secret).toBe('string')
    expect(secret.length).toBe(10)
  })

  test('generates a string of length 1', () => {
    const secret = genSecret(1)
    expect(secret.length).toBe(1)
  })

  test('generates empty string for length 0', () => {
    const secret = genSecret(0)
    expect(secret).toBe('')
  })

  test('generates different secrets on consecutive calls (randomness)', () => {
    const secrets = new Set<string>()
    for (let i = 0; i < 20; i++) {
      secrets.add(genSecret(20))
    }
    // With 20 chars (62 possible), collisions are astronomically unlikely
    expect(secrets.size).toBeGreaterThan(1)
  })

  test('only contains alphanumeric characters', () => {
    const secret = genSecret(50)
    expect(secret).toMatch(/^[A-Za-z0-9]+$/)
  })
})
