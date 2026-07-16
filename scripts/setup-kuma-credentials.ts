import { io } from 'socket.io-client'

interface SetupResponse {
  ok: boolean
  msg?: string
}

async function setupUptimeKuma(url: string, username: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = io(url, { reconnection: false })

    socket.on('connect', async () => {
      try {
        const needsSetup = await new Promise<boolean>((res, rej) => {
          socket.emit('needSetup', (response: boolean) => res(response))
          setTimeout(() => rej(new Error('Timeout waiting for needSetup')), 5000)
        })

        if (needsSetup) {
          console.log('Setting up Uptime Kuma with admin credentials...')
          await new Promise<void>((res, rej) => {
            socket.emit('setup', username, password, (response: SetupResponse) => {
              if (response.ok) {
                console.log('Setup completed successfully')
                res()
              } else {
                rej(new Error(`Setup failed: ${response.msg ?? 'Unknown error'}`))
              }
            })
          })
        } else {
          console.log('Uptime Kuma is already set up')
        }

        socket.disconnect()
        resolve()
      } catch (error) {
        socket.disconnect()
        reject(error)
      }
    })

    socket.on('connect_error', (error) => {
      reject(new Error(`Connection failed: ${error.message}`))
    })
  })
}

async function withSpinner<T>(message: string, promise: Promise<T>): Promise<T> {
  let loadingIndex = 0
  const loadingStates = ['|', '/', '-', '\\']

  const loadingInterval = setInterval(() => {
    process.stdout.write(`\r${loadingStates[loadingIndex] ?? '|'} ${message}`)
    loadingIndex = (loadingIndex + 1) % loadingStates.length
  }, 100)

  const hasCursor = typeof process.stdout.cursorTo === 'function'

  try {
    const result = await promise
    clearInterval(loadingInterval)
    if (hasCursor) process.stdout.cursorTo(0)
    process.stdout.write(`\r✓ ${message}\n`)
    return result
  } catch (error) {
    clearInterval(loadingInterval)
    if (hasCursor) process.stdout.cursorTo(0)
    process.stdout.write(`\rx ${message}\n`)
    throw error
  }
}

const url = Bun.env.UPTIME_KUMA_URL
const username = Bun.env.UPTIME_KUMA_USERNAME
const password = Bun.env.UPTIME_KUMA_PASSWORD

if (!url || !username || !password) {
  console.error(
    'UPTIME_KUMA_URL, UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD environment variables must be set',
  )
  process.exit(1)
}

const timeout = 10000

const p = (async () => {
  const timeoutAt = Date.now() + timeout
  while (Date.now() < timeoutAt) {
    try {
      const res = await fetch(`${url}/setup`)
      if (res.ok) return
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for Uptime-Kuma after ${timeout / 1000} seconds`)
})()

try {
  await withSpinner('Waiting for Uptime-Kuma to become available', p)
  await withSpinner('Setting up Uptime-Kuma credentials', setupUptimeKuma(url, username, password))
} catch (error) {
  console.error(`x ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

console.log('All done!')
process.exit(0)
