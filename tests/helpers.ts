import { io } from 'socket.io-client'

interface BaseResponse {
  ok: boolean
  msg?: string
}

interface LoginResponse {
  ok: boolean
  token?: string
  msg?: string
}

/**
 * Set up a fresh Uptime Kuma instance with admin credentials.
 * Uses the socket.io 'needSetup' / 'setup' events.
 */
export async function setupUptimeKuma(
  url: string,
  username: string,
  password: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = io(url, { reconnection: false })

    socket.on('connect', async () => {
      try {
        const needsSetup = await new Promise<boolean>((res, rej) => {
          socket.emit('needSetup', (response: boolean) => res(response))
          setTimeout(() => rej(new Error('Timeout waiting for needSetup')), 5000)
        })

        if (needsSetup) {
          await new Promise<void>((res, rej) => {
            socket.emit('setup', username, password, (response: BaseResponse) => {
              if (response.ok) {
                res()
              } else {
                rej(new Error(`Setup failed: ${response.msg ?? 'Unknown error'}`))
              }
            })
          })
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

/**
 * Wait for Uptime Kuma to be ready by polling the health endpoint,
 * then verifying Socket.IO connectivity.
 */
export async function waitForUptimeKuma(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 404) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const socketReady = await testSocketConnection(url)
        if (socketReady) return
      }
    } catch {
      // Server not ready yet, continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  throw new Error(`Uptime Kuma did not become ready within ${timeoutMs}ms`)
}

/**
 * Test if a Socket.IO connection can be established.
 */
export async function testSocketConnection(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = io(url, { reconnection: false, timeout: 5000 })

    const timer = setTimeout(() => {
      socket.disconnect()
      resolve(false)
    }, 5000)

    socket.on('connect', () => {
      clearTimeout(timer)
      socket.disconnect()
      resolve(true)
    })

    socket.on('connect_error', () => {
      clearTimeout(timer)
      socket.disconnect()
      resolve(false)
    })
  })
}

/**
 * Delete all monitors from the Uptime Kuma instance (clean slate for tests).
 */
export async function cleanupAllMonitors(
  url: string,
  username: string,
  password: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = io(url, { reconnection: false })

    socket.on('connect', async () => {
      try {
        await new Promise<void>((res, rej) => {
          socket.emit('login', { username, password }, (response: LoginResponse) => {
            if (response.ok) {
              res()
            } else {
              rej(new Error(`Login failed: ${response.msg ?? 'Unknown error'}`))
            }
          })
        })

        const monitors = await new Promise<Array<{ id: number; name: string }>>((res, rej) => {
          const handleMonitorList = (data: Record<string, unknown>) => {
            socket.off('monitorList', handleMonitorList)
            res(Object.values(data) as Array<{ id: number; name: string }>)
          }

          socket.on('monitorList', handleMonitorList)

          socket.emit('getMonitorList', (response: BaseResponse) => {
            if (!response.ok) {
              socket.off('monitorList', handleMonitorList)
              rej(new Error(`Failed to get monitors: ${response.msg ?? 'Unknown error'}`))
            }
          })

          setTimeout(() => {
            socket.off('monitorList', handleMonitorList)
            rej(new Error('Timeout waiting for monitor list'))
          }, 5000)
        })

        const failures: string[] = []
        for (const monitor of monitors) {
          await new Promise<void>((res) => {
            socket.emit('deleteMonitor', monitor.id, (response: BaseResponse) => {
              if (!response.ok) {
                failures.push(`monitor ${monitor.id}: ${response.msg ?? 'Unknown error'}`)
              }
              res()
            })
          })
        }
        if (failures.length > 0) {
          throw new Error(`Cleanup failed: ${failures.join('; ')}`)
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
