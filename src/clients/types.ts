// src/clients/types.ts

/**
 * Common, unified return types for all container‐runtime clients.
 */

/** A minimal, standardized representation of a “container” (or pod, etc.). */
export interface ContainerInfo {
  /** The unique identifier (ID or name) of the instance. */
  id: string;

  /** A human‐readable name or alias, if available. */
  name?: string;

  /** The current status (e.g. "Running", "Stopped", "Created"), if known. */
  status?: string;

  /** The image (or image reference) used to create this instance, if known. */
  image?: string;

  /** An ISO‐8601 timestamp of creation, if known. */
  createdAt?: string;

  /** The raw, engine‐specific payload for deeper inspection. */
  raw?: unknown;
}

/** A standardized response for actions like start/stop/restart/remove. */
export interface ActionResponse {
  /** `true` if the action succeeded. */
  success: boolean;

  /** If `success === false`, a short error message. */
  error?: string;
}

/** A standardized response for fetching logs. */
export interface LogsResponse {
  /** The full logs (stdout + stderr) as one concatenated string. */
  logs: string;
}

/** A generic “create” payload—engine‐specific fields may be passed here. */
export type CreateOptions = Record<string, unknown>;

/**
 * Fully‐unified interface for any container runtime.
 * All implementations must follow these method signatures exactly.
 */
export interface ContainerRuntime {
  /** List all “instances” (containers, pods, etc.). */
  list(): Promise<ContainerInfo[]>;

  /** Create a new “instance” with an engine‐specific payload. */
  create(options: CreateOptions): Promise<ContainerInfo>;

  /** Inspect (get) a single “instance” by ID or name. */
  inspect(id: string): Promise<ContainerInfo>;

  /** Start an “instance”; returns whether it succeeded. */
  start(id: string): Promise<ActionResponse>;

  /** Stop an “instance”; returns whether it succeeded. */
  stop(id: string): Promise<ActionResponse>;

  /** Restart an “instance”; returns whether it succeeded. */
  restart(id: string): Promise<ActionResponse>;

  /** Remove (delete) an “instance”; returns whether it succeeded. */
  remove(id: string): Promise<ActionResponse>;

  /** Fetch logs (stdout + stderr) for an “instance.” */
  logs(id: string): Promise<LogsResponse>;
}

/** An error to throw when a subclass hasn’t implemented a method. */
export class UnimplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not implemented by this runtime client.`);
    this.name = "UnimplementedError";
  }
}
