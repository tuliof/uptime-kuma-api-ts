/**
 * Maintenance window — schedule, associate monitors, graceful shutdown.
 *
 * Usage:
 *   KUMA_URL=http://localhost:3001 KUMA_USER=admin KUMA_PASS=secret123 \
 *     bun run examples/maintenance-window.ts
 *
 */

import { UptimeKumaApi } from 'uptime-kuma-api-ts'

const url = process.env.KUMA_URL ?? 'http://localhost:3001'
const username = process.env.KUMA_USER ?? 'admin'
const password = process.env.KUMA_PASS ?? ''

const api = new UptimeKumaApi({ url })
await api.connect()
await api.login(username, password)

// Ensure clean disconnect on exit
process.on('SIGINT', async () => {
  await api.disconnect()
  process.exit(0)
})

// Create a maintenance window
const maintenanceResult = await api.maintenance.add({
  title: 'Scheduled DB Migration',
  strategy: 'single',
  dateRange: ['2025-12-15T22:00:00Z', '2025-12-16T06:00:00Z'],
  durationMinutes: 480,
  active: true,
  description: '',
  intervalDay: 1,
  weekdays: [],
  daysOfMonth: [],
  cron: '30 3 * * *',
})
console.log('Maintenance window created:', maintenanceResult)

// Pause all HTTP monitors
const allMonitors = await api.monitors.list()
const httpMonitors = allMonitors.filter((m) => m.type === 'http')
for (const m of httpMonitors) {
  await api.monitors.pause(m.id)
  console.log(`  Paused ${m.name} (#${m.id})`)
}

// Associate paused monitors with the maintenance (if we got an ID back)
if (maintenanceResult.msg) {
  // Re-fetch to get the maintenance ID
  const maintenances = await api.maintenance.list()
  const created = maintenances.find((m) => m.title === 'Scheduled DB Migration')
  if (created) {
    await api.maintenance.addMonitors(
      created.id,
      httpMonitors.map((m) => m.id),
    )
    console.log(`Associated ${httpMonitors.length} monitor(s) with maintenance`)
  }
}

await api.disconnect()
console.log('Done')
