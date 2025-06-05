import type {
  ClientOptions,
  DockerClientType,
  DockerCreateRequest,
  DockerCreateResponse,
  DockerInspectResponse,
} from "./types.ts";
import { httpRequest } from "./utils/http.ts";

export class DockerClient implements DockerClientType {
  private client: Deno.HttpClient;
  constructor(opts: ClientOptions = {}) {
    const socketPath = opts.socketPath as string ?? "/var/run/docker.sock";
    this.client = Deno.createHttpClient({
      proxy: { transport: "unix", path: socketPath },
    });
  }
  async checkPermissions(): Promise<boolean> {
    try {
      // List containers is a harmless, minimal permission check
      await httpRequest<never, unknown[]>({
        method: "GET",
        url: "/v1.41/containers/json",
        client: this.client,
      });
      return true;
    } catch (_e) {
      return false;
    }
  }
  create(options: DockerCreateRequest) {
    return httpRequest<DockerCreateRequest, DockerCreateResponse>({
      method: "POST",
      url: "/v1.41/containers/create",
      client: this.client,
      body: options,
    });
  }
  inspect(id: string) {
    return httpRequest<never, DockerInspectResponse>({
      method: "GET",
      url: `/v1.41/containers/${id}/json`,
      client: this.client,
    });
  }
  start(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v1.41/containers/${id}/start`,
      client: this.client,
    });
  }
  stop(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v1.41/containers/${id}/stop`,
      client: this.client,
    });
  }
}
