/**
 * Quick start — connect, CRUD, disconnect.
 *
 * Usage:
 *   KUMA_URL=http://localhost:3001 KUMA_USER=admin KUMA_PASS=secret123 \
 *     bun run examples/quick-start.ts
 *
 */

import { UptimeKumaApi } from 'uptime-kuma-api-ts'

const url = process.env.KUMA_URL ?? 'http://localhost:3001'
const username = process.env.KUMA_USER ?? 'admin'
const password = process.env.KUMA_PASS ?? ''

const api = new UptimeKumaApi({ url })
await api.connect()
console.log('Connected')

// First-run setup
if (await api.needSetup()) {
  await api.setup(username, password)
  console.log('Server set up')
}

await api.login(username, password)
console.log('Authenticated')

// List monitors
const monitors = await api.monitors.list()
console.log(`Found ${monitors.length} monitor(s)`)

// Create a monitor
const { monitorID, msg } = await api.monitors.add({
  type: 'http',
  name: 'Example Site',
  url: 'https://example.com',
  interval: 60,
})
console.log(`Created monitor #${monitorID}: ${msg}`)

// Pause, then resume
await api.monitors.pause(monitorID)
console.log('Paused')
await api.monitors.resume(monitorID)
console.log('Resumed')

// Clean up
await api.monitors.delete(monitorID)
console.log('Deleted')

await api.disconnect()
console.log('Done')
