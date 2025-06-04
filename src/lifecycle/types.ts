// src/lifecycle/types.ts

import type { ContainerPlatform } from "jsr:@ggpwnkthx/infra-sense@0.1.8";

/**
 * Describes a client that can query container status, start a container,
 * stop a container, and create a new container.
 */
export interface LifecycleClient {
  /** The detected container platform. */
  platform: ContainerPlatform;

  /** Fetches the status of a single container by its ID or name. */
  status: (containerId: string) => Promise<Deno.CommandOutput>;

  /** Starts a single container by its ID or name. */
  start: (containerId: string) => Promise<Deno.CommandOutput>;

  /** Stops a single container by its ID or name. */
  stop: (containerId: string) => Promise<Deno.CommandOutput>;

  /**
   * Creates a new container with the given ID (name) from the specified image.
   * For Docker/Podman‐compatible platforms, this runs:
   *   docker create --name <containerId> <image>
   */
  create: (containerId: string, image: string) => Promise<Deno.CommandOutput>;
}
