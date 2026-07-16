/**
 * Socket.IO event names used by Uptime Kuma.
 */
export const Event = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MONITOR_LIST: 'monitorList',
  NOTIFICATION_LIST: 'notificationList',
  PROXY_LIST: 'proxyList',
  STATUS_PAGE_LIST: 'statusPageList',
  HEARTBEAT_LIST: 'heartbeatList',
  IMPORTANT_HEARTBEAT_LIST: 'importantHeartbeatList',
  AVG_PING: 'avgPing',
  UPTIME: 'uptime',
  HEARTBEAT: 'heartbeat',
  INFO: 'info',
  CERT_INFO: 'certInfo',
  DOCKER_HOST_LIST: 'dockerHostList',
  AUTO_LOGIN: 'autoLogin',
  INIT_SERVER_TIMEZONE: 'initServerTimezone',
  MAINTENANCE_LIST: 'maintenanceList',
  API_KEY_LIST: 'apiKeyList',
} as const

export type EventName = (typeof Event)[keyof typeof Event]

/** Events that are cached in the event data store (populated by sio.on handlers). */
export const CACHED_EVENTS = [
  Event.MONITOR_LIST,
  Event.NOTIFICATION_LIST,
  Event.PROXY_LIST,
  Event.STATUS_PAGE_LIST,
  Event.HEARTBEAT_LIST,
  Event.IMPORTANT_HEARTBEAT_LIST,
  Event.AVG_PING,
  Event.UPTIME,
  Event.INFO,
  Event.CERT_INFO,
  Event.DOCKER_HOST_LIST,
  Event.AUTO_LOGIN,
  Event.MAINTENANCE_LIST,
  Event.API_KEY_LIST,
] as const
