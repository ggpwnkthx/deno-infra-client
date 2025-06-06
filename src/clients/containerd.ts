// src/clients/containerd.ts

import type {
  ClientOptions,
  ContainerdClientType,
  ContainerdCreateRequest,
  ContainerdCreateResponse,
  ContainerdInspectResponse,
  ContainerdListResponse,
} from "./types.ts";
import { UnimplementedError } from "./types.ts";
import { Client as ContainerdClientLib } from "containerd";

/**
 * Wraps the @containers-js/containerd Client to implement ContainerdClientType.
 * - Uses a Unix socket by default (e.g. /run/containerd/containerd.sock)
 * - Operates within a given namespace (default "default")
 */
export class ContainerdClient implements ContainerdClientType {
  private client: ContainerdClientLib;

  constructor(opts: ClientOptions = {}) {
    // Determine the socket path (with unix:// prefix if not already present)
    const rawSocket = (opts.socketPath as string) ??
      "/run/containerd/containerd.sock";
    const socketUrl =
      rawSocket.startsWith("unix://") || rawSocket.startsWith("npipe://")
        ? rawSocket
        : `unix://${rawSocket}`;

    // Use the provided namespace or default to "default"
    const namespace = (opts.namespace as string) ?? "default";

    // Instantiate the underlying containerd client
    this.client = new ContainerdClientLib(socketUrl, namespace);
  }

  /**
   * Create a new container in containerd
   *
   * @param options  The raw request payload matching ContainerdCreateRequest
   * @returns        The full response object matching ContainerdCreateResponse
   */
  async create(
    options: ContainerdCreateRequest,
  ): Promise<ContainerdCreateResponse> {
    // Directly pass the strongly-typed request into containerd
    const response = await this.client.containers.create(options);
    return response;
  }

  /**
   * Inspect (get) a single container’s detailed info
   *
   * @param id  The container ID to inspect
   * @returns   Detailed container information matching ContainerdInspectResponse
   */
  inspect(id: string): Promise<ContainerdInspectResponse> {
    // Delegates to client.containers.get, passing a typed request { id }
    return this.client.containers.get({ id });
  }

  /**
   * List all containerd containers in the current namespace
   *
   * @returns  The full response matching ContainerdListResponse
   */
  async list(): Promise<ContainerdListResponse> {
    // client.containers.list() returns a typed ContainerdListResponse
    return (await this.client.containers.list({})).containers;
  }

  /** Start is not implemented here; containerd tasks are managed via TaskService */
  start(_id: string): Promise<void> {
    throw new UnimplementedError("ContainerdClient.start");
  }

  /** Stop is not implemented here; containerd tasks are managed via TaskService */
  stop(_id: string): Promise<void> {
    throw new UnimplementedError("ContainerdClient.stop");
  }

  /** Restart is not implemented here; containerd tasks are managed via TaskService */
  restart(_id: string): Promise<void> {
    throw new UnimplementedError("ContainerdClient.restart");
  }

  /**
   * Remove (delete) a container
   *
   * @param id  The container ID to delete
   * @returns   The full response matching ContainerdDeleteResponse
   */
  async remove(id: string): Promise<void> {
    // Delegates to client.containers.delete with a typed request { id }
    await this.client.containers.delete({ id });
  }

  /** Logs are not implemented at this layer (TaskService is required) */
  logs(_id: string): Promise<string> {
    throw new UnimplementedError("ContainerdClient.logs");
  }
}
