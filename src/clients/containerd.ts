// src/clients/containerd.ts

import type {
  ClientOptions,
  ContainerdClientType,
  ContainerdCreateRequest,
  ContainerdCreateResponse,
  ContainerdInspectResponse,
} from "./types.ts";
import { createGrpcClient, grpcRequest } from "./utils/grpc.ts";

type ContainerdGrpc = {
  Create: (
    req: ContainerdCreateRequest,
    cb: (err: Error | null, resp: ContainerdCreateResponse) => void,
  ) => void;
  Get: (
    req: { id: string },
    cb: (err: Error | null, resp: ContainerdInspectResponse) => void,
  ) => void;
  List: (
    req: unknown,
    cb: (err: Error | null, resp: { containers: unknown[] }) => void,
  ) => void;
  // Note: containerd’s full API also has Delete, Task, etc., but our simplified type here omits them.
};

export class ContainerdClient implements ContainerdClientType {
  private client: ContainerdGrpc;

  constructor(opts: ClientOptions = {}) {
    const socketPath = (opts.socketPath as string) ??
      "/run/containerd/containerd.sock";
    const protoPath = (opts.protoPath as string) ?? "path/to/containerd.proto";
    this.client = createGrpcClient<ContainerdGrpc>(
      protoPath,
      "containerd.services.containers.v1",
      "Containers",
      socketPath,
    );
  }

  /** Create a new container in containerd */
  create(options: ContainerdCreateRequest) {
    return grpcRequest<ContainerdCreateRequest, ContainerdCreateResponse>(
      this.client.Create,
      options,
    );
  }

  /** Inspect a container */
  inspect(id: string) {
    return grpcRequest<{ id: string }, ContainerdInspectResponse>(
      this.client.Get,
      { id },
    );
  }

  /** Start is not directly supported here (requires using Tasks API) */
  start(_id: string) {
    return Promise.reject(
      new Error(
        "Containerd: start not directly supported; handled by Tasks API.",
      ),
    );
  }

  /** Stop is not directly supported here (handled by Tasks API) */
  stop(_id: string) {
    return Promise.reject(
      new Error(
        "Containerd: stop not directly supported; handled by Tasks API.",
      ),
    );
  }

  /** List all containerd containers */
  async list(): Promise<unknown[]> {
    const resp = await new Promise<{ containers: unknown[] }>(
      (resolve, reject) => {
        this.client.List({}, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      },
    );
    return resp.containers;
  }

  /** Restart a containerd container */
  restart(_id: string): Promise<unknown> {
    // Since `start` and `stop` are not supported at this layer, simply throw for now
    throw new Error(
      "Containerd: restart not supported in this client implementation.",
    );
  }

  /** Remove a containerd container */
  remove(_id: string): Promise<void> {
    // In a complete containerd client, this would call the Delete RPC. Here:
    throw new Error(
      "Containerd: remove not supported in this client implementation.",
    );
  }

  /** Fetch logs for a containerd container */
  logs(_id: string): Promise<string> {
    // containerd logs are usually retrieved via the Task service (Stdout/Stderr). Omitted here.
    throw new Error(
      "Containerd: logs not supported in this client implementation.",
    );
  }
}
