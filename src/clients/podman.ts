// src/clients/podman.ts

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
    const socketPath = (opts.socketPath as string) ?? "/run/podman/podman.sock";
    this.client = Deno.createHttpClient({
      proxy: { transport: "unix", path: socketPath },
    });
  }

  /** Create a new Podman container */
  create(options: PodmanCreateRequest) {
    return httpRequest<PodmanCreateRequest, PodmanCreateResponse>({
      method: "POST",
      url: "/v4.4.0/libpod/containers/create",
      client: this.client,
      body: options,
    });
  }

  /** Inspect a Podman container */
  inspect(id: string) {
    return httpRequest<never, PodmanInspectResponse>({
      method: "GET",
      url: `/v4.4.0/libpod/containers/${id}/json`,
      client: this.client,
    });
  }

  /** Start a Podman container */
  start(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v4.4.0/libpod/containers/${id}/start`,
      client: this.client,
    });
  }

  /** Stop a Podman container */
  stop(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v4.4.0/libpod/containers/${id}/stop`,
      client: this.client,
    });
  }

  /** List all Podman containers (running and stopped) */
  async list(): Promise<unknown[]> {
    const resp = await httpRequest<never, unknown[]>({
      method: "GET",
      url: `/v4.4.0/libpod/containers/json?all=true`,
      client: this.client,
    });
    return resp;
  }

  /** Restart a Podman container */
  restart(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v4.4.0/libpod/containers/${id}/restart`,
      client: this.client,
    });
  }

  /** Remove a Podman container */
  remove(id: string) {
    return httpRequest<never, void>({
      method: "DELETE",
      url: `/v4.4.0/libpod/containers/${id}`,
      client: this.client,
    });
  }

  /** Fetch logs for a Podman container */
  async logs(id: string): Promise<string> {
    const text = await httpRequest<never, string>({
      method: "GET",
      url: `/v4.4.0/libpod/containers/${id}/logs?stdout=true&stderr=true`,
      client: this.client,
    });
    return text;
  }
}
