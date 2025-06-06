// src/clients/docker.ts

import type {
  ActionResponse,
  ContainerInfo,
  CreateOptions,
  LogsResponse,
} from "./types.ts";
import Docker from "dockerode";
import { AbstractClient } from "./base.ts";
import type { Buffer } from "node:buffer";

/**
 * DockerClient uses dockerode to communicate with the Docker daemon
 * over a Unix socket.  Implements all ContainerRuntime methods by
 * mapping dockerode’s payloads into our standardized return types.
 */
export class DockerClient extends AbstractClient {
  private docker: Docker;

  constructor(opts: { socketPath?: string } = {}) {
    const socketPath = opts.socketPath ?? "/var/run/docker.sock";
    super();
    this.docker = new Docker({ socketPath });
  }

  /** List all containers (running and stopped). */
  override async list(): Promise<ContainerInfo[]> {
    const rawList = await this.docker.listContainers({ all: true });
    return rawList.map((c: any) => {
      return {
        id: c.Id,
        name: Array.isArray(c.Names) && c.Names.length > 0
          ? c.Names[0].replace(/^\//, "")
          : undefined,
        status: c.State,
        image: c.Image,
        createdAt: new Date((c.Created as number) * 1000).toISOString(),
        raw: c,
      };
    });
  }

  /** Create a new container. */
  override async create(
    options: CreateOptions,
  ): Promise<ContainerInfo> {
    try {
      const container = await this.docker.createContainer(options as any);
      return {
        id: container.id,
        name: undefined,
        status: "Created",
        raw: container,
      };
    } catch (err: unknown) {
      throw err;
    }
  }

  /** Inspect a container (get detailed info). */
  override async inspect(id: string): Promise<ContainerInfo> {
    const container = this.docker.getContainer(id);
    const info = (await container.inspect()) as any;
    return {
      id: info.Id,
      name: info.Name?.replace(/^\//, "") ?? undefined,
      status: info.State?.Status ?? undefined,
      image: info.Config?.Image ?? undefined,
      createdAt: info.Created ?? undefined,
      raw: info,
    };
  }

  /** Start a container. */
  override async start(id: string): Promise<ActionResponse> {
    try {
      const container = this.docker.getContainer(id);
      await container.start();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /** Stop a container. */
  override async stop(id: string): Promise<ActionResponse> {
    try {
      const container = this.docker.getContainer(id);
      await container.stop();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /** Restart a container. */
  override async restart(id: string): Promise<ActionResponse> {
    try {
      const container = this.docker.getContainer(id);
      await container.restart();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /** Remove a container. */
  override async remove(id: string): Promise<ActionResponse> {
    try {
      const container = this.docker.getContainer(id);
      await container.remove();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /**
   * Fetch logs (stdout + stderr) as a full string.
   * We collect the stream into one string and return it.
   */
  override async logs(id: string): Promise<LogsResponse> {
    try {
      const container = this.docker.getContainer(id);
      const logStream = await container.logs({
        stdout: true,
        stderr: true,
        follow: false,
        tail: "all",
      });

      return await new Promise<LogsResponse>((resolve, reject) => {
        let output = "";
        logStream.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });
        logStream.on("end", () => {
          resolve({ logs: output });
        });
        logStream.on("error", (err: any) => {
          reject(err);
        });
      });
    } catch (err: any) {
      return { logs: `Error fetching logs: ${err?.message ?? String(err)}` };
    }
  }
}
