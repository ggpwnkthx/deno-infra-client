// src/clients/lxd.ts

import type {
  ClientOptions,
  LxdClientType,
  LxdCreateRequest,
  LxdCreateResponse,
  LxdInspectResponse,
} from "./types.ts";
import { httpRequest } from "./utils/http.ts";

interface LxdContainerListResponse {
  metadata: Array<{ name: string; [k: string]: unknown }>;
  [key: string]: unknown;
}

export class LxdClient implements LxdClientType {
  private client: Deno.HttpClient;

  constructor(opts: ClientOptions = {}) {
    const socketPath = (opts.socketPath as string) ??
      "/var/snap/lxd/common/lxd/unix.socket";
    this.client = Deno.createHttpClient({
      proxy: { transport: "unix", path: socketPath },
    });
  }

  /** Create a new LXD container */
  create(options: LxdCreateRequest) {
    return httpRequest<LxdCreateRequest, LxdCreateResponse>({
      method: "POST",
      url: "/1.0/containers",
      client: this.client,
      body: options,
    });
  }

  /** Inspect a container */
  inspect(name: string) {
    return httpRequest<never, LxdInspectResponse>({
      method: "GET",
      url: `/1.0/containers/${name}`,
      client: this.client,
    });
  }

  /** Start a container */
  start(name: string) {
    return httpRequest<
      { action: string; timeout: number; force: boolean },
      unknown
    >({
      method: "PUT",
      url: `/1.0/containers/${name}/state`,
      client: this.client,
      body: { action: "start", timeout: 30, force: true },
    });
  }

  /** Stop a container */
  stop(name: string) {
    return httpRequest<
      { action: string; timeout: number; force: boolean },
      unknown
    >({
      method: "PUT",
      url: `/1.0/containers/${name}/state`,
      client: this.client,
      body: { action: "stop", timeout: 30, force: true },
    });
  }

  /** List all containers (names and minimal info) */
  async list(): Promise<unknown[]> {
    const resp = await httpRequest<never, LxdContainerListResponse>({
      method: "GET",
      url: "/1.0/containers",
      client: this.client,
    });
    if (Array.isArray(resp.metadata)) {
      return resp.metadata.map((entry) => entry.name);
    }
    return [];
  }

  /** Restart a container (stop then start) */
  async restart(name: string): Promise<unknown> {
    await this.stop(name);
    return this.start(name);
  }

  /** Remove a container (force = true to delete even if running) */
  async remove(name: string): Promise<void> {
    await httpRequest<never, void>({
      method: "DELETE",
      url: `/1.0/containers/${name}?force=true`,
      client: this.client,
    });
  }

  /** Fetch logs for a container (not directly supported via simple endpoint) */
  logs(_: string): Promise<string> {
    // LXD requires specifying a specific log file name (e.g., /1.0/containers/{name}/logs/lxc.log).
    throw new Error(
      "LXD: logs operation must specify a log file and is not implemented in this client.",
    );
  }
}
