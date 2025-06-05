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
};

export class ContainerdClient implements ContainerdClientType {
  private client: ContainerdGrpc;
  constructor(opts: ClientOptions = {}) {
    const socketPath = opts.socketPath as string ??
      "/run/containerd/containerd.sock";
    const protoPath = opts.protoPath as string ?? "path/to/containerd.proto";
    this.client = createGrpcClient<ContainerdGrpc>(
      protoPath,
      "containerd.services.containers.v1",
      "Containers",
      socketPath,
    );
  }
  async checkPermissions(): Promise<boolean> {
    try {
      await grpcRequest<unknown, { containers: unknown[] }>(
        this.client.List,
        {},
      );
      return true;
    } catch (_e) {
      return false;
    }
  }
  create(options: ContainerdCreateRequest) {
    return grpcRequest<ContainerdCreateRequest, ContainerdCreateResponse>(
      this.client.Create,
      options,
    );
  }
  inspect(id: string) {
    return grpcRequest<{ id: string }, ContainerdInspectResponse>(
      this.client.Get,
      { id },
    );
  }
  start(_id: string) {
    return Promise.reject(
      "Containerd: start not directly supported; handled by tasks API.",
    );
  }
  stop(_id: string) {
    return Promise.reject(
      "Containerd: stop not directly supported; handled by tasks API.",
    );
  }
}
