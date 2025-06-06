// src/clients/podman.ts

import { DockerClient } from "./docker.ts";

/**
 * PodmanClient reuses DockerClient to communicate with the Podman socket.
 * Podman provides a Docker-compatible REST API, so using dockerode against
 * the Podman socket works identically to Docker.
 *
 * We simply subclass DockerClient and point it at Podman's Unix socket.
 */
export class PodmanClient extends DockerClient {
  constructor(opts: { socketPath?: string } = {}) {
    // Use Podman's default socket if none is provided.
    const socketPath = opts.socketPath ?? "/run/podman/podman.sock";
    // Pass the Podman socket to DockerClient's constructor.
    super({ socketPath });
  }
}
