// src/clients/docker.ts

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
    const socketPath = (opts.socketPath as string) ?? "/var/run/docker.sock";
    this.client = Deno.createHttpClient({
      proxy: { transport: "unix", path: socketPath },
    });
  }

  /** Create a new container */
  create(options: DockerCreateRequest) {
    return httpRequest<DockerCreateRequest, DockerCreateResponse>({
      method: "POST",
      url: "/v1.41/containers/create",
      client: this.client,
      body: options,
    });
  }

  /** Inspect a container (get detailed info) */
  inspect(id: string) {
    return httpRequest<never, DockerInspectResponse>({
      method: "GET",
      url: `/v1.41/containers/${id}/json`,
      client: this.client,
    });
  }

  /** Start a container */
  start(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v1.41/containers/${id}/start`,
      client: this.client,
    });
  }

  /** Stop a container */
  stop(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v1.41/containers/${id}/stop`,
      client: this.client,
    });
  }

  /** List all containers (running and stopped) */
  async list(): Promise<unknown[]> {
    const resp = await httpRequest<never, unknown[]>({
      method: "GET",
      url: `/v1.41/containers/json?all=true`,
      client: this.client,
    });
    return resp;
  }

  /** Restart a container (stop then start) */
  restart(id: string) {
    return httpRequest<never, unknown>({
      method: "POST",
      url: `/v1.41/containers/${id}/restart`,
      client: this.client,
    });
  }

  /** Remove a container */
  remove(id: string) {
    return httpRequest<never, void>({
      method: "DELETE",
      url: `/v1.41/containers/${id}`,
      client: this.client,
    });
  }

  /** Fetch logs (stdout + stderr) */
  async logs(id: string): Promise<string> {
    // Combine stdout and stderr by default (Docker API merges them if both flags are set)
    const text = await httpRequest<never, string>({
      method: "GET",
      url: `/v1.41/containers/${id}/logs?stdout=true&stderr=true`,
      client: this.client,
    });
    return text;
  }
}
