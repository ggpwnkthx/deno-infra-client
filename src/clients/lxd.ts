// src/clients/lxd.ts

import {
  Client as TsLxdClient,
  type Container as TsLxdContainer,
} from "npm:ts-lxd";
import type {
  LxdClientType,
  LxdCreateRequest,
  LxdCreateResponse,
  LxdInspectResponse,
} from "./types.ts";
import { UnimplementedError } from "./types.ts";

export class LxdClient implements LxdClientType {
  private client: TsLxdClient;

  constructor(opts: { socketPath?: string } = {}) {
    // ts-lxd will connect to the local LXD UNIX socket by default.
    // If you need a custom socket, set the LXD_REMOTE or LXD_UNIX_SOCKET
    // env var before launching your Deno process. For most setups, no extra
    // config is needed.
    this.client = new TsLxdClient(opts.socketPath);
  }

  /**
   * Create a new LXD container.
   *
   * We assume `options.source.type` is either an image alias or an image fingerprint.
   * If you need to handle more elaborate source objects (e.g. custom image server),
   * you can expand this accordingly.
   */
  async create(options: LxdCreateRequest): Promise<LxdCreateResponse> {
    // ts-lxd’s createContainer method signature is:
    //   createContainer(name: string, imageAlias: string): Promise<Container>
    // Here, we pass options.name and either a shorthand for image (alias) or
    // fall back to whatever `source.type` says.
    //
    // Note: ts-lxd treats the second argument as an “image name/alias” (e.g. "ubuntu:20.04").
    // If you want to pin by fingerprint, you can also pass that string here.

    const imageRef =
      (options.source as { alias?: string; type: string }).alias ??
        (options.source as { type: string }).type;

    const container: TsLxdContainer = await this.client.createContainer(
      options.name,
      imageRef,
    );

    // Return a minimal “fake” LXD REST response indicating creation succeeded.
    // LxdCreateResponse is:
    //   interface LxdCreateResponse {
    //     type: string;
    //     status: string;
    //     status_code: number;
    //     operation: string;
    //     [key: string]: unknown;
    //   }
    //
    // We set type/status based on the fact ts-lxd does the launch immediately.
    return {
      type: "sync",
      status: "Created",
      status_code: 200,
      operation: container.name,
    };
  }

  /**
   * Inspect (get) a single container.
   * We'll return a minimal subset of fields to match LxdInspectResponse.
   */
  async inspect(name: string): Promise<LxdInspectResponse> {
    // ts-lxd’s getContainer returns a `Container` object if found. If the container
    // does not exist, ts-lxd throws an error.
    let container: TsLxdContainer;
    try {
      container = await this.client.getContainer(name);
    } catch (err) {
      // Propagate as a simple Error; consumer can catch and handle.
      throw new Error(`Container "${name}" not found: ${String(err)}`);
    }

    // We fetch the current state of the container (running/stopped, etc).
    let state: TsLxdContainer["state"] | "Unknown";
    try {
      state = container.state;
    } catch {
      state = "Unknown";
    }

    return {
      type: "sync",
      status: "OK",
      status_code: 200,
      operation: "",
      metadata: {
        name: container.name,
        status: container.status,
        stateful: state === "Stopped" ? false : true,
        ephemeral: container.ephemeral ?? false,
      },
    };
  }

  /** Start a container by name. */
  async start(name: string): Promise<void> {
    const container = await this.client.getContainer(name);
    // ts-lxd’s Container.start() will do nothing if already running.
    await container.start();
  }

  /** Stop a container by name. */
  async stop(name: string): Promise<void> {
    const container = await this.client.getContainer(name);
    // ts-lxd’s Container.stop() waits until the container is fully stopped.
    await container.stop();
  }

  /** List all containers (just names). */
  async list(): Promise<unknown[]> {
    // ts-lxd’s client.containers() returns a list of Container objects.
    const containers: TsLxdContainer[] = await this.client.getAllContainers();
    // We map to just the container names, to match the old behavior.
    return containers.map((c) => c.name);
  }

  /** Restart a container (stop then start). */
  async restart(name: string): Promise<void> {
    const container = await this.client.getContainer(name);
    await container.restart();
  }

  /** Remove (delete) a container by name. */
  async remove(name: string): Promise<void> {
    const container = await this.client.getContainer(name);
    // ts-lxd’s Container.delete() is equivalent to “lxc delete --force”.
    await container.delete();
  }

  /**
   * Fetch logs for a container by name.
   * ts-lxd does not provide a direct “logs” method; you must exec “journal” or similar
   * inside. We’ll throw UnimplementedError here.
   */
  logs(_name: string): Promise<string> {
    throw new UnimplementedError("LxdClient.logs");
  }
}
