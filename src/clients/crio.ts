// src/clients/crio.ts

import type {
  ClientOptions,
  CrioClientType,
  CrioCreateRequest,
  CrioCreateResponse,
  CrioInspectResponse,
} from "./types.ts";
import { createGrpcClient, grpcRequest } from "./utils/grpc.ts";

type CrioGrpc = {
  CreateContainer: (
    req: CrioCreateRequest,
    cb: (err: Error | null, resp: CrioCreateResponse) => void,
  ) => void;
  ContainerStatus: (
    req: { container_id: string },
    cb: (err: Error | null, resp: CrioInspectResponse) => void,
  ) => void;
  ListContainers: (
    req: Record<string, unknown>,
    cb: (err: Error | null, resp: { containers: unknown[] }) => void,
  ) => void;
  StartContainer: (
    req: { container_id: string },
    cb: (err: Error | null, resp: unknown) => void,
  ) => void;
  StopContainer: (
    req: { container_id: string },
    cb: (err: Error | null, resp: unknown) => void,
  ) => void;
  // Note: CRI-O API often has RemoveContainer, but our `CrioGrpc` type here does not include it.
};

export class CrioClient implements CrioClientType {
  private client: CrioGrpc;

  constructor(opts: ClientOptions = {}) {
    const socketPath = (opts.socketPath as string) ?? "/var/run/crio/crio.sock";
    const protoPath = (opts.protoPath as string) ?? "path/to/criapi.proto";
    this.client = createGrpcClient<CrioGrpc>(
      protoPath,
      "runtime.v1alpha2",
      "RuntimeService",
      socketPath,
    );
  }

  /** Create a CRI-O container */
  create(options: CrioCreateRequest) {
    return grpcRequest<CrioCreateRequest, CrioCreateResponse>(
      this.client.CreateContainer,
      options,
    );
  }

  /** Inspect a CRI-O container */
  inspect(id: string) {
    return grpcRequest<{ container_id: string }, CrioInspectResponse>(
      this.client.ContainerStatus,
      { container_id: id },
    );
  }

  /** Start a CRI-O container */
  start(id: string) {
    return grpcRequest<{ container_id: string }, unknown>(
      this.client.StartContainer,
      { container_id: id },
    );
  }

  /** Stop a CRI-O container */
  stop(id: string) {
    return grpcRequest<{ container_id: string }, unknown>(
      this.client.StopContainer,
      { container_id: id },
    );
  }

  /** List all CRI-O containers */
  async list(): Promise<unknown[]> {
    const resp = await new Promise<{ containers: unknown[] }>(
      (resolve, reject) => {
        this.client.ListContainers({}, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      },
    );
    return resp.containers;
  }

  /** Restart a CRI-O container (stop then start) */
  async restart(id: string): Promise<unknown> {
    await this.stop(id);
    return this.start(id);
  }

  /** Remove a CRI-O container */
  remove(_id: string): Promise<void> {
    // CRI-O RemoveContainer isn't defined in our `CrioGrpc` type.
    // If/when RemoveContainer is added to the proto, implement here.
    throw new Error("CRI-O: remove operation is not supported in this client.");
  }

  /** Fetch logs for a CRI-O container */
  logs(_id: string): Promise<string> {
    // CRI-O’s standard RuntimeService does not have a logs RPC in this definition.
    // Typically, logs are fetched from the kubelet or via `crictl logs`.
    throw new Error("CRI-O: logs operation is not supported in this client.");
  }
}
