import { z } from 'zod'

/**
 * Docker connection types.
 *
 * - `'socket'`: Connect via local Unix socket
 * - `'tcp'`: Connect via TCP (remote or local)
 */
export const DockerTypeSchema = z.enum(['socket', 'tcp'])

export type DockerType = z.infer<typeof DockerTypeSchema>

/** Input for adding or editing a Docker host. */
export const DockerHostConfigSchema = z.object({
  /** Human-readable name for this Docker host. */
  name: z.string(),
  /** Connection type: Unix socket or TCP. */
  dockerType: DockerTypeSchema,
  /**
   * Docker daemon endpoint.
   * - For `socket`: defaults to `/var/run/docker.sock`
   * - For `tcp`: defaults to `tcp://localhost:2375`
   */
  dockerDaemon: z.string().nullable().optional(),
})

export type DockerHostConfig = z.infer<typeof DockerHostConfigSchema>

/** A Docker host record as returned by the API (includes id). */
export const DockerHostSchema = DockerHostConfigSchema.extend({
  /** Unique Docker host identifier. */
  id: z.number(),
})

export type DockerHost = z.infer<typeof DockerHostSchema>
