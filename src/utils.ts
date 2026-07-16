/**
 * Utility helpers for transforming Uptime Kuma API data.
 *
 * All functions are pure — they return new objects/arrays instead of mutating inputs.
 */

/** Convert specified integer fields (0/1) to booleans. Returns a new object or array. */
export function intToBool<T extends Record<string, unknown>>(data: T, keys: string[]): T
export function intToBool<T extends Record<string, unknown>>(data: T[], keys: string[]): T[]
export function intToBool(data: null | undefined, keys: string[]): null | undefined
export function intToBool(data: number | string, keys: string[]): number | string
export function intToBool<T extends Record<string, unknown>>(
  data: T | T[] | null | undefined | number | string,
  keys: string[],
): T | T[] | null | undefined | number | string {
  if (Array.isArray(data)) {
    return data.map((item) => intToBool(item, keys)) as T[]
  }
  if (!data || typeof data !== 'object') {
    return data
  }
  const result = { ...data } as Record<string, unknown>
  for (const key of keys) {
    if (key in result) {
      result[key] = result[key] === 1 || result[key] === true
    }
  }
  return result as T
}

/** Parse a field value to a specific type, with a default if null/undefined. Returns a new object or array. */
export function parseValue<T extends Record<string, unknown>>(
  data: T,
  key: string,
  type: 'string' | 'number' | 'boolean',
  defaultValue?: unknown,
): T
export function parseValue<T extends Record<string, unknown>>(
  data: T[],
  key: string,
  type: 'string' | 'number' | 'boolean',
  defaultValue?: unknown,
): T[]
export function parseValue(
  data: null | undefined,
  key: string,
  type: 'string' | 'number' | 'boolean',
  defaultValue?: unknown,
): null | undefined
export function parseValue<T extends Record<string, unknown>>(
  data: T | T[] | null | undefined,
  key: string,
  _type: 'string' | 'number' | 'boolean',
  defaultValue?: unknown,
): T | T[] | null | undefined {
  if (!data) return data
  if (Array.isArray(data)) {
    return data.map((item) => parseValue(item, key, _type, defaultValue)) as T[]
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (!(key in obj)) return data
    if (obj[key] === null || obj[key] === undefined) {
      if (defaultValue !== undefined) {
        const result = { ...obj }
        result[key] = defaultValue
        return result as T
      }
    }
  }
  return data
}

/** Convert monitor notificationIDList from dict {id: true} to array of ids. Returns a new object. */
export function convertMonitorNotificationIds(
  monitor: Record<string, unknown>,
): Record<string, unknown> {
  const list = monitor.notificationIDList
  if (list && typeof list === 'object' && !Array.isArray(list)) {
    return {
      ...monitor,
      notificationIDList: Object.keys(list as Record<string, unknown>).map(Number),
    }
  }
  return monitor
}

/** Convert monitor notificationIDList from array of ids to dict {id: true}. Returns a new object. */
export function convertMonitorNotificationIdsToDict(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const list = data.notificationIDList
  if (Array.isArray(list)) {
    const dict: Record<number, boolean> = {}
    for (const id of list) {
      dict[id as number] = true
    }
    return { ...data, notificationIDList: dict }
  }
  if (!list) {
    return { ...data, notificationIDList: {} }
  }
  return data
}

/** Generate a random alphanumeric secret string of the given length. */
export function genSecret(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i]! % chars.length]
  }
  return result
}
