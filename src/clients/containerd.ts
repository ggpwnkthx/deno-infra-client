// src/clients/containerd.ts

import type { ActionResponse, ContainerInfo, CreateOptions } from "./types.ts";
import { Client as ContainerdClientLib } from "containerd";
import { AbstractClient } from "./base.ts";

/**
 * Wraps the @containers-js/containerd Client to implement our
 * universal ContainerRuntime interface.  Maps containerd‐specific
 * payloads into ContainerInfo, ActionResponse, and LogsResponse.
 */
export class ContainerdClient extends AbstractClient {
  private client: ContainerdClientLib;

  constructor(opts: CreateOptions = {}) {
    // Determine the socket path (with unix:// prefix if needed)
    const rawSocket = (opts.socketPath as string) ??
      "/run/containerd/containerd.sock";
    const socketUrl =
      rawSocket.startsWith("unix://") || rawSocket.startsWith("npipe://")
        ? rawSocket
        : `unix://${rawSocket}`;

    // Use the provided namespace or default to "default"
    const namespace = (opts.namespace as string) ?? "default";

    super();
    this.client = new ContainerdClientLib(socketUrl, namespace);
  }

  /** Create a new container in containerd. */
  override async create(
    options: CreateOptions,
  ): Promise<ContainerInfo> {
    try {
      const response = await this.client.containers.create(
        options as any,
      );
      // Attempt to extract an ID; fallback to undefined if not present
      const id = (response as any).id ?? (response as any).Name ?? "";
      return {
        id: id,
        name: undefined,
        status: "Created",
        raw: response,
      };
    } catch (err: any) {
      throw err;
    }
  }

  /** Inspect a single container’s detailed info. */
  override async inspect(id: string): Promise<ContainerInfo> {
    try {
      const resp = await this.client.containers.get({ id });
      // Map fields if known; otherwise put everything in raw
      return {
        id: (resp as any).id ?? id,
        name: (resp as any).id ?? id,
        status: (resp as any).status ?? undefined,
        image: (resp as any).image ?? undefined,
        createdAt: (resp as any).createdAt ?? undefined,
        raw: resp,
      };
    } catch (err: any) {
      throw new Error(
        `Containerd inspect failed: ${err?.message ?? String(err)}`,
      );
    }
  }

  /** List all containers in the current namespace. */
  override async list(): Promise<ContainerInfo[]> {
    try {
      const resp = await this.client.containers.list({});
      const containers = resp.containers ?? [];
      return containers.map((c: any) => {
        return {
          id: c.id ?? "",
          name: c.id ?? "",
          status: c.status ?? undefined,
          image: c.image ?? undefined,
          createdAt: c.createdAt ?? undefined,
          raw: c,
        };
      });
    } catch (err: any) {
      throw new Error(`Containerd list failed: ${err?.message ?? String(err)}`);
    }
  }

  /** Remove (delete) a container. */
  override async remove(id: string): Promise<ActionResponse> {
    try {
      await this.client.containers.delete({ id });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }
}
