// src/clients/kubernetes.ts

import type {
  ClientOptions,
  KubernetesClientType,
  KubernetesPodResponse,
  KubernetesPodSpec,
} from "./types.ts";
import { httpRequest } from "./utils/http.ts";

interface KubernetesPodList {
  items: unknown[];
  [key: string]: unknown;
}

export class KubernetesClient implements KubernetesClientType {
  private apiServer: string;
  private token: string;
  private namespace: string;

  constructor(opts: ClientOptions = {}) {
    this.apiServer = (opts.apiServer as string) ??
      "https://kubernetes.default.svc";
    this.token = (opts.token as string) ??
      Deno.readTextFileSync(
        "/var/run/secrets/kubernetes.io/serviceaccount/token",
      );
    this.namespace = (opts.namespace as string) ?? "default";
  }

  /** Create a Pod in Kubernetes */
  create(options: KubernetesPodSpec) {
    return httpRequest<KubernetesPodSpec, KubernetesPodResponse>({
      method: "POST",
      url: `/api/v1/namespaces/${this.namespace}/pods`,
      baseUrl: this.apiServer,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
      },
      body: options,
    });
  }

  /** Inspect (get) a single Pod's status */
  inspect(name: string) {
    return httpRequest<never, KubernetesPodResponse>({
      method: "GET",
      url: `/api/v1/namespaces/${this.namespace}/pods/${name}`,
      baseUrl: this.apiServer,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
      },
    });
  }

  /** Kubernetes doesn't have a direct "start" for a Pod (handled by the controller) */
  start(_: string) {
    return Promise.reject(
      new Error("Start operation is not applicable for Kubernetes pods."),
    );
  }

  /** Delete (stop/remove) a Pod */
  stop(name: string) {
    return httpRequest<never, unknown>({
      method: "DELETE",
      url: `/api/v1/namespaces/${this.namespace}/pods/${name}`,
      baseUrl: this.apiServer,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
      },
    });
  }

  /** List all Pods in the current namespace */
  async list(): Promise<unknown[]> {
    const resp = await httpRequest<never, KubernetesPodList>({
      method: "GET",
      url: `/api/v1/namespaces/${this.namespace}/pods`,
      baseUrl: this.apiServer,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
      },
    });
    return Array.isArray(resp.items) ? resp.items : [];
  }

  /** Restart a Pod = delete and let it be recreated (if controlled) */
  restart(_name: string): Promise<never> {
    return Promise.reject(
      new Error(
        "Restart operation is not directly supported. Please delete the Pod and reapply its spec via create().",
      ),
    );
  }

  /** Remove a Pod: alias for stop() */
  async remove(name: string): Promise<void> {
    await this.stop(name);
  }

  /** Fetch logs for a Pod */
  async logs(name: string): Promise<string> {
    // By default, fetch stdout logs. (You can add query params: container=…)
    const text = await httpRequest<never, string>({
      method: "GET",
      url: `/api/v1/namespaces/${this.namespace}/pods/${name}/log`,
      baseUrl: this.apiServer,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
      },
    });
    return text;
  }
}
