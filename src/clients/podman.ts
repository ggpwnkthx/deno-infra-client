import type {
  ClientOptions,
  PodmanClientType,
  PodmanCreateRequest,
  PodmanCreateResponse,
  PodmanInspectResponse,
} from "./types.ts";
import { httpRequest } from "./utils/http.ts";

export class PodmanClient implements PodmanClientType {
  private client: Deno.HttpClient;
  constructor(opts: ClientOptions = {}) {
    const socketPath = opts.socketPath as string ?? "/run/podman/podman.sock";
    this.client = Deno.createHttpClient({
      proxy: { transport: "unix", path: socketPath },
    });
  }
  async checkPermissions(): Promise<boolean> {
    try {
      await httpRequest<never, unknown[]>({
        method: "GET",
        url: "/v4.4.0/libpod/containers/json",
        client: this.client,
      });
      return true;
    } catch (_e) {
      return false;
    }
  }
  create(options: PodmanCreateRequest) {
    return httpRequest<PodmanCreateRequest, PodmanCreateResponse>({
      method: "POST",
      url: "/v4.4.0/libpod/containers/create",
      client: this.client,
      body: options,
    });
  }
  inspect(id: string) {
    return httpRequest<never, PodmanInspectResponse>({
      method: "GET",
      url: `/v4.4.0/libpod/containers/${id}/json`,
      client: this.client,
    });
  }
  start(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v4.4.0/libpod/containers/${id}/start`,
      client: this.client,
    });
  }
  stop(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v4.4.0/libpod/containers/${id}/stop`,
      client: this.client,
    });
  }
}
