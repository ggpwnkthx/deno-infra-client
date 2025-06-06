// src/clients/docker.ts

import type {
  DockerClientType,
  DockerCreateRequest,
  DockerCreateResponse,
  DockerInspectResponse,
} from "./types.ts";
import Docker from "dockerode";
import type { Buffer } from "node:buffer";

/**
 * DockerClient uses the dockerode package to communicate with the Docker daemon
 * over a Unix socket. Implements all ContainerRuntime methods: list, create,
 * inspect, start, stop, restart, remove, logs.
 */
export class DockerClient implements DockerClientType {
  private docker: Docker;

  constructor(opts: { socketPath?: string } = {}) {
    const socketPath = opts.socketPath ?? "/var/run/docker.sock";
    this.docker = new Docker({ socketPath });
  }

  /** List all containers (running and stopped) */
  async list(): Promise<unknown[]> {
    const containers = await this.docker.listContainers({ all: true });
    return containers;
  }

  /** Create a new container */
  async create(options: DockerCreateRequest): Promise<DockerCreateResponse> {
    // dockerode’s createContainer returns a Container object with an `id` property
    const container = await this.docker.createContainer(options);
    return { id: container.id };
  }

  /** Inspect a container (get detailed info) */
  async inspect(id: string): Promise<DockerInspectResponse> {
    const container = this.docker.getContainer(id);
    const info = await container.inspect();
    // The returned object from container.inspect() already matches DockerInspectResponse
    return info as DockerInspectResponse;
  }

  /** Start a container */
  async start(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.start();
  }

  /** Stop a container */
  async stop(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.stop();
  }

  /** Restart a container */
  async restart(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.restart();
  }

  /** Remove a container */
  async remove(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.remove();
  }

  /**
   * Fetch logs (stdout + stderr) as a full string.
   * Uses dockerode’s logs() which returns a stream; we collect it into a string.
   */
  async logs(id: string): Promise<string> {
    const container = this.docker.getContainer(id);
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
      tail: "all",
    });

    return new Promise<string>((resolve, reject) => {
      let output = "";
      logStream.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      logStream.on("end", () => {
        resolve(output);
      });
      logStream.on("error", (err: any) => {
        reject(err);
      });
    });
  }
}
