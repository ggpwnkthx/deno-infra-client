import type {
  ClientOptions,
  KubernetesClientType,
  KubernetesPodResponse,
  KubernetesPodSpec,
} from "./types.ts";
import { httpRequest } from "./utils/http.ts";

export class KubernetesClient implements KubernetesClientType {
  private apiServer: string;
  private token: string;
  private namespace: string;
  constructor(opts: ClientOptions = {}) {
    this.apiServer = opts.apiServer as string ??
      "https://kubernetes.default.svc";
    this.token = opts.token as string ??
      Deno.readTextFileSync(
        "/var/run/secrets/kubernetes.io/serviceaccount/token",
      );
    this.namespace = opts.namespace as string ?? "default";
  }
  async checkPermissions(): Promise<boolean> {
    try {
      // List pods (the minimal "manage pod" permission)
      await httpRequest<never, unknown>({
        method: "GET",
        url: `/api/v1/namespaces/${this.namespace}/pods`,
        baseUrl: this.apiServer,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
      });
      return true;
    } catch (_e) {
      return false;
    }
  }
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
  start(_: string) {
    return Promise.reject(
      new Error("Start operation is not applicable for Kubernetes pods."),
    );
  }
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
}
