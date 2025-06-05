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
};

export class CrioClient implements CrioClientType {
  private client: CrioGrpc;
  constructor(opts: ClientOptions = {}) {
    const socketPath = opts.socketPath as string ?? "/var/run/crio/crio.sock";
    const protoPath = opts.protoPath as string ?? "path/to/criapi.proto";
    this.client = createGrpcClient<CrioGrpc>(
      protoPath,
      "runtime.v1alpha2",
      "RuntimeService",
      socketPath,
    );
  }
  async checkPermissions(): Promise<boolean> {
    try {
      await grpcRequest<Record<string, unknown>, { containers: unknown[] }>(
        this.client.ListContainers,
        {},
      );
      return true;
    } catch (_e) {
      return false;
    }
  }
  create(options: CrioCreateRequest) {
    return grpcRequest<CrioCreateRequest, CrioCreateResponse>(
      this.client.CreateContainer,
      options,
    );
  }
  inspect(id: string) {
    return grpcRequest<{ container_id: string }, CrioInspectResponse>(
      this.client.ContainerStatus,
      { container_id: id },
    );
  }
  start(id: string) {
    return grpcRequest<{ container_id: string }, unknown>(
      this.client.StartContainer,
      { container_id: id },
    );
  }
  stop(id: string) {
    return grpcRequest<{ container_id: string }, unknown>(
      this.client.StopContainer,
      { container_id: id },
    );
  }
}
