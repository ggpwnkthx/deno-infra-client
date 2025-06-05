import type {
  ClientOptions,
  LxdClientType,
  LxdCreateRequest,
  LxdCreateResponse,
  LxdInspectResponse,
} from "./types.ts";
import { httpRequest } from "./utils/http.ts";

export class LxdClient implements LxdClientType {
  private client: Deno.HttpClient;
  constructor(opts: ClientOptions = {}) {
    const socketPath = opts.socketPath as string ??
      "/var/snap/lxd/common/lxd/unix.socket";
    this.client = Deno.createHttpClient({
      proxy: { transport: "unix", path: socketPath },
    });
  }
  async checkPermissions(): Promise<boolean> {
    try {
      // List containers (non-destructive)
      await httpRequest<never, unknown>({
        method: "GET",
        url: "/1.0/containers",
        client: this.client,
      });
      return true;
    } catch (_e) {
      return false;
    }
  }
  create(options: LxdCreateRequest) {
    return httpRequest<LxdCreateRequest, LxdCreateResponse>({
      method: "POST",
      url: "/1.0/containers",
      client: this.client,
      body: options,
    });
  }
  inspect(name: string) {
    return httpRequest<never, LxdInspectResponse>({
      method: "GET",
      url: `/1.0/containers/${name}`,
      client: this.client,
    });
  }
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
}
