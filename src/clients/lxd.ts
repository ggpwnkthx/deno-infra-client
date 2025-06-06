// src/clients/lxd.ts

import type { ActionResponse, ContainerInfo, CreateOptions } from "./types.ts";
import {
  Client as TsLxdClient,
  type Container as TsLxdContainer,
} from "npm:ts-lxd";
import { AbstractClient } from "./base.ts";

/**
 * LxdClient wraps ts-lxd to implement our unified ContainerRuntime interface.
 * We map LXD payloads into ContainerInfo / ActionResponse / LogsResponse.
 */
export class LxdClient extends AbstractClient {
  private client: TsLxdClient;

  constructor(opts: { socketPath?: string } = {}) {
    super();
    // ts-lxd will connect to the local LXD socket by default.
    // If you need a custom socket, set LXD_REMOTE or LXD_UNIX_SOCKET in ENV.
    this.client = new TsLxdClient(opts.socketPath);
  }

  /** Create a new LXD container. */
  override async create(options: CreateOptions): Promise<ContainerInfo> {
    try {
      const createReq = options as {
        name: string;
        source: { type: string; alias?: string };
      };
      const imageRef = createReq.source.alias ?? createReq.source.type;
      const container: TsLxdContainer = await this.client.createContainer(
        createReq.name,
        imageRef,
      );
      return {
        id: container.name,
        name: container.name,
        status: "Created",
        raw: container,
      };
    } catch (err: any) {
      throw new Error(`LXD create failed: ${err?.message ?? String(err)}`);
    }
  }

  /** Inspect (get) a single container. */
  override async inspect(name: string): Promise<ContainerInfo> {
    try {
      const container: TsLxdContainer = await this.client.getContainer(name);
      let state: TsLxdContainer["state"] | "Unknown";
      try {
        state = container.state;
      } catch {
        state = "Unknown";
      }
      const meta = container.metadata ?? {};
      return {
        id: container.name,
        name: container.name,
        status: container.status ?? undefined,
        createdAt: undefined,
        raw: {
          metadata: meta,
          state: state,
          ephemeral: container.ephemeral,
        },
      };
    } catch (err: any) {
      throw new Error(
        `Container "${name}" not found: ${err?.message ?? String(err)}`,
      );
    }
  }

  /** Start a container by name. */
  override async start(name: string): Promise<ActionResponse> {
    try {
      const container = await this.client.getContainer(name);
      await container.start();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /** Stop a container by name. */
  override async stop(name: string): Promise<ActionResponse> {
    try {
      const container = await this.client.getContainer(name);
      await container.stop();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /** List all containers (just names). */
  override async list(): Promise<ContainerInfo[]> {
    try {
      const containers: TsLxdContainer[] = await this.client.getAllContainers();
      return containers.map((c) => {
        return {
          id: c.name,
          name: c.name,
          status: c.status ?? undefined,
          raw: c,
        };
      });
    } catch (err: any) {
      throw new Error(`LXD list failed: ${err?.message ?? String(err)}`);
    }
  }

  /** Restart a container (stop then start). */
  override async restart(name: string): Promise<ActionResponse> {
    try {
      const container = await this.client.getContainer(name);
      await container.restart();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /** Remove (delete) a container by name. */
  override async remove(name: string): Promise<ActionResponse> {
    try {
      const container = await this.client.getContainer(name);
      await container.delete();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }
}
