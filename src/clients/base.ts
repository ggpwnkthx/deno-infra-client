// src/clients/base.ts

import type {
  ActionResponse,
  ContainerInfo,
  ContainerRuntime,
  CreateOptions,
  LogsResponse,
} from "./types.ts";

import { UnimplementedError } from "./types.ts";

/**
 * Abstract base for all container‐runtime clients.
 *
 * Provides “default” implementations for every method that simply throw
 * UnimplementedError.  Subclasses must override each method and convert
 * their engine‐specific payloads into our standard return types.
 */
export abstract class AbstractClient implements ContainerRuntime {
  /** List all “instances” (containers, pods, etc.). */
  list(): Promise<ContainerInfo[]> {
    throw new UnimplementedError(`${this.constructor.name}.list`);
  }

  /** Create a new “instance” (container, pod, etc.). */
  create(options: CreateOptions): Promise<ContainerInfo> {
    throw new UnimplementedError(`${this.constructor.name}.create`);
  }

  /** Inspect a single “instance” by ID or name. */
  inspect(id: string): Promise<ContainerInfo> {
    throw new UnimplementedError(`${this.constructor.name}.inspect`);
  }

  /** Start an “instance” by ID or name. */
  start(id: string): Promise<ActionResponse> {
    throw new UnimplementedError(`${this.constructor.name}.start`);
  }

  /** Stop an “instance” by ID or name. */
  stop(id: string): Promise<ActionResponse> {
    throw new UnimplementedError(`${this.constructor.name}.stop`);
  }

  /** Restart an “instance” by ID or name. */
  restart(id: string): Promise<ActionResponse> {
    throw new UnimplementedError(`${this.constructor.name}.restart`);
  }

  /** Remove (delete) an “instance” by ID or name. */
  remove(id: string): Promise<ActionResponse> {
    throw new UnimplementedError(`${this.constructor.name}.remove`);
  }

  /** Fetch logs (stdout+stderr) for an “instance” by ID or name. */
  logs(id: string): Promise<LogsResponse> {
    throw new UnimplementedError(`${this.constructor.name}.logs`);
  }
}
