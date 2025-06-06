// src/clients/kubernetes.ts

import type {
  ActionResponse,
  ContainerInfo,
  CreateOptions,
  LogsResponse,
} from "./types.ts";
import * as k8s from "kubernetes-node";
import { AbstractClient } from "./base.ts";

/**
 * KubernetesClient implements our unified interface using
 * @kubernetes/client-node’s CoreV1Api.  Every method maps
 * Kubernetes payloads into ContainerInfo / ActionResponse / LogsResponse.
 */
export class KubernetesClient extends AbstractClient {
  private coreV1: k8s.CoreV1Api;
  private namespace: string;

  constructor(opts: CreateOptions = {}) {
    super();
    this.namespace = (opts.namespace as string) ?? "default";

    const kc = new k8s.KubeConfig();
    const apiServer = opts.apiServer as string | undefined;
    const token = opts.token as string | undefined;

    if (apiServer && token) {
      const clusterName = "infra-client-cluster";
      const userName = "infra-client-user";
      const contextName = "infra-client-context";

      kc.loadFromOptions({
        clusters: [
          {
            name: clusterName,
            server: apiServer,
            skipTLSVerify: true,
          },
        ],
        users: [
          {
            name: userName,
            token: token,
          },
        ],
        contexts: [
          {
            name: contextName,
            cluster: clusterName,
            user: userName,
            namespace: this.namespace,
          },
        ],
        currentContext: contextName,
      });
    } else {
      kc.loadFromCluster();
    }

    this.coreV1 = kc.makeApiClient(k8s.CoreV1Api);
  }

  /** Create a Pod in Kubernetes. */
  override async create(
    options: CreateOptions,
  ): Promise<ContainerInfo> {
    try {
      const podReq = options as {
        metadata: k8s.V1ObjectMeta & { name: string };
        spec: k8s.V1PodSpec;
      };
      const resp = await this.coreV1.createNamespacedPod({
        namespace: this.namespace,
        body: {
          metadata: podReq.metadata,
          spec: podReq.spec,
        },
      });
      // Depending on the client, resp may be { body: V1Pod } or resp.body
      const pod = (resp as any).body ?? resp;
      const podMeta = (pod as any).metadata ?? {};
      const podStatus = (pod as any).status ?? {};

      return {
        id: podMeta.name ?? "",
        name: podMeta.name ?? undefined,
        status: podStatus.phase ?? "Unknown",
        image:
          Array.isArray(pod.spec?.containers) && pod.spec.containers.length > 0
            ? (pod.spec.containers[0].image as string)
            : undefined,
        createdAt: podMeta.creationTimestamp ?? undefined,
        raw: pod,
      };
    } catch (err: any) {
      throw new Error(
        `Kubernetes create failed: ${err?.message ?? String(err)}`,
      );
    }
  }

  /** Inspect (get) a single Pod’s details. */
  override async inspect(name: string): Promise<ContainerInfo> {
    try {
      const resp = await this.coreV1.readNamespacedPod({
        name: name,
        namespace: this.namespace,
      });
      const pod = (resp as any).body ?? resp;
      const podMeta = (pod as any).metadata ?? {};
      const podStatus = (pod as any).status ?? {};

      return {
        id: podMeta.name ?? "",
        name: podMeta.name ?? undefined,
        status: podStatus.phase ?? "Unknown",
        image:
          Array.isArray(pod.spec?.containers) && pod.spec.containers.length > 0
            ? (pod.spec.containers[0].image as string)
            : undefined,
        createdAt: podMeta.creationTimestamp ?? undefined,
        raw: pod,
      };
    } catch (err: any) {
      throw new Error(
        `Kubernetes inspect failed: ${err?.message ?? String(err)}`,
      );
    }
  }

  /**
   * Delete (stop/remove) a Pod.  Returns whether it succeeded.
   */
  override async stop(name: string): Promise<ActionResponse> {
    try {
      const resp = await this.coreV1.deleteNamespacedPod({
        name: name,
        namespace: this.namespace,
      });
      // `resp` may be { body: V1Status } or resp.body
      const status = (resp as any).body?.status ?? (resp as any).status ??
        "Unknown";
      const success = String(status).toLowerCase() === "success";
      return { success };
    } catch (err: any) {
      return {
        success: false,
        error: `Delete failed: ${err?.message ?? String(err)}`,
      };
    }
  }

  /** List all Pods in the current namespace. */
  override async list(): Promise<ContainerInfo[]> {
    try {
      const resp = await this.coreV1.listNamespacedPod({
        namespace: this.namespace,
      });
      const pods = (resp as any).body?.items ?? resp.items ?? [];
      return pods.map((pod: any) => {
        const meta = pod.metadata ?? {};
        const status = pod.status ?? {};
        return {
          id: meta.name ?? "",
          name: meta.name ?? undefined,
          status: status.phase ?? "Unknown",
          image: Array.isArray(pod.spec?.containers) &&
              pod.spec.containers.length > 0
            ? (pod.spec.containers[0].image as string)
            : undefined,
          createdAt: meta.creationTimestamp ?? undefined,
          raw: pod,
        };
      });
    } catch (err: any) {
      throw new Error(`Kubernetes list failed: ${err?.message ?? String(err)}`);
    }
  }

  /** Remove a Pod (alias for stop). */
  override remove(name: string): Promise<ActionResponse> {
    return this.stop(name);
  }

  /** Fetch logs for a Pod (all containers’ stdout+stderr by default). */
  override async logs(name: string): Promise<LogsResponse> {
    try {
      const resp = await this.coreV1.readNamespacedPodLog({
        name: name,
        namespace: this.namespace,
        follow: false,
        previous: false,
        timestamps: false,
      });
      // Some clients return a string directly, others attach to .body
      const text = (resp as any).body ?? resp;
      return { logs: String(text) };
    } catch (err: any) {
      return { logs: `Error fetching logs: ${err?.message ?? String(err)}` };
    }
  }
}
