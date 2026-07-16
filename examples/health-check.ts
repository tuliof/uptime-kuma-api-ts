/**
 * Health-check pattern — create a monitor, tag it, check its status.
 *
 * Usage:
 *   KUMA_URL=http://localhost:3001 KUMA_USER=admin KUMA_PASS=secret123 \
 *     bun run examples/health-check.ts
 *
 */

import { UptimeKumaApi } from 'uptime-kuma-api-ts'

const url = process.env.KUMA_URL ?? 'http://localhost:3001'
const username = process.env.KUMA_USER ?? 'admin'
const password = process.env.KUMA_PASS ?? ''

const api = new UptimeKumaApi({ url })
await api.connect()
await api.login(username, password)

// Create or reuse a tag
const tags = await api.tags.list()
let tagId: number
const productionTag = tags.find((t) => t.name === 'production')
if (productionTag) {
  tagId = productionTag.id
} else {
  tagId = (await api.tags.add({ name: 'production', color: '#e74c3c' })).id!
  console.log(`Created tag #${tagId}`)
}

// Create an HTTP monitor
const { monitorID } = await api.monitors.add({
  type: 'http',
  name: 'Production API',
  url: 'https://api.mycompany.com/health',
  interval: 30,
  maxretries: 3,
  notificationIDList: [1], // your Slack/email notification ID
})
console.log(`Created monitor #${monitorID}`)

// Attach the tag
await api.monitors.addTag(tagId, monitorID, 'api')
console.log('Tagged')

// Derive current status from cached heartbeats
const status = await api.monitors.getStatus(monitorID)
console.log(`Status: ${status}`)
// → 'up' | 'down' | 'pending' | 'maintenance'

// Fetch recent heartbeats
const beats = await api.monitors.getBeats(monitorID, 1)
console.log(`Last ${beats.length} heartbeat(s) in the past hour`)

// Clean up
await api.monitors.deleteTag(tagId, monitorID)
await api.monitors.delete(monitorID)
console.log('Cleaned up')

await api.disconnect()
