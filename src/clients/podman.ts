// src/clients/podman.ts

import { DockerClient } from "./docker.ts";

/**
 * PodmanClient reuses DockerClient to communicate with the Podman socket.
 * Podman exposes a Docker‐compatible REST API, so dockerode works unchanged.
 */
export class PodmanClient extends DockerClient {
  constructor(opts: { socketPath?: string } = {}) {
    const socketPath = opts.socketPath ?? "/run/podman/podman.sock";
    super({ socketPath });
  }
}
