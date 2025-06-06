// src/clients/kubernetes.ts

import type {
  ClientOptions,
  KubernetesClientType,
  KubernetesDeleteResponse,
  KubernetesPodCreateRequest,
  KubernetesPodResponse,
} from "./types.ts";
import * as k8s from "kubernetes-node";

/**
 * KubernetesClient (implements KubernetesClientType) using
 * @kubernetes/client-node’s CoreV1Api under the hood.
 */
export class KubernetesClient implements KubernetesClientType {
  private coreV1: k8s.CoreV1Api;
  private namespace: string;

  constructor(opts: ClientOptions = {}) {
    // Determine the namespace (default to "default")
    this.namespace = (opts.namespace as string) ?? "default";

    // Build or load a KubeConfig
    const kc = new k8s.KubeConfig();
    const apiServer = opts.apiServer as string | undefined;
    const token = opts.token as string | undefined;

    if (apiServer && token) {
      // Construct in‐memory kubeconfig matching the API Server + Bearer token
      const clusterName = "infra-client-cluster";
      const userName = "infra-client-user";
      const contextName = "infra-client-context";

      kc.loadFromOptions({
        clusters: [
          {
            name: clusterName,
            server: apiServer,
            // If you have a CA bundle, replace skipTLSVerify: true with caData: "<base64CA>"
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
      // If no explicit apiServer/token, assume in‐cluster service account
      kc.loadFromCluster();
    }

    // Instantiate the CoreV1Api
    this.coreV1 = kc.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Create a Pod in Kubernetes.
   *
   * @param options  A minimal V1Pod payload (metadata + spec only).
   * @returns        The fully‐populated V1Pod object from the API.
   */
  async create(
    options: KubernetesPodCreateRequest,
  ): Promise<KubernetesPodResponse> {
    // ❌ Old (incorrect):
    // const resp = await this.coreV1.createNamespacedPod(this.namespace, options);
    //
    // ✅ New (correct): pass a single request object
    const resp = await this.coreV1.createNamespacedPod({
      namespace: this.namespace,
      body: {
        metadata: options.metadata,
        spec: options.spec,
      },
      // optional query params can also be passed here:
      // pretty?: string;
      // dryRun?: string;
      // fieldManager?: string;
      // fieldValidation?: string;
    });
    return resp;
  }

  /**
   * Inspect (get) a single Pod’s details.
   *
   * @param name  The Pod’s name (in this.namespace).
   * @returns     The full V1Pod object.
   */
  async inspect(name: string): Promise<KubernetesPodResponse> {
    const resp = await this.coreV1.readNamespacedPod({
      name: name,
      namespace: this.namespace,
      // optional: pretty?: string;
    });
    return resp;
  }

  /** “Start” is not applicable for standalone Pods */
  start(_: string): Promise<void> {
    return Promise.reject(
      new Error("Start operation is not applicable for Kubernetes pods."),
    );
  }

  /**
   * Delete (stop/remove) a Pod.
   *
   * @param name  The Pod’s name.
   * @returns     The V1Status returned by the API.
   */
  async stop(name: string): Promise<KubernetesDeleteResponse> {
    const resp = await this.coreV1.deleteNamespacedPod({
      name: name,
      namespace: this.namespace,
      // optional query params:
      // pretty?: string;
      // dryRun?: string;
      // gracePeriodSeconds?: number;
      // orphanDependents?: boolean;
      // propagationPolicy?: string;
      // body?: V1DeleteOptions;
    });
    return resp;
  }

  /**
   * List all Pods in the current namespace.
   *
   * @returns  An array of V1Pod objects (never undefined).
   */
  async list(): Promise<KubernetesPodResponse[]> {
    const resp = await this.coreV1.listNamespacedPod({
      namespace: this.namespace,
      // optional query parameters:
      // pretty?: string;
      // _continue?: string;
      // fieldSelector?: string;
      // labelSelector?: string;
      // limit?: number;
      // resourceVersion?: string;
      // timeoutSeconds?: number;
      // watch?: boolean;
    });
    return resp.items ?? [];
  }

  /** Restart a Pod – not directly supported. Consumer must delete + re-create. */
  restart(_name: string): Promise<never> {
    return Promise.reject(
      new Error(
        "Restart operation is not directly supported. Please delete the Pod and reapply via create().",
      ),
    );
  }

  /** Remove a Pod (alias for stop). */
  async remove(name: string): Promise<void> {
    await this.stop(name);
  }

  /**
   * Fetch logs for a Pod (all containers’ stdout+stderr by default).
   *
   * @param name  The Pod’s name.
   * @returns     A string containing the combined logs.
   */
  async logs(name: string): Promise<string> {
    const resp = await this.coreV1.readNamespacedPodLog({
      name: name,
      namespace: this.namespace,
      follow: false,
      pretty: undefined,
      previous: false,
      sinceSeconds: undefined,
      tailLines: undefined,
      limitBytes: undefined,
      timestamps: false,
      // other optional query parameters:
      // container?: string;
    });
    return resp;
  }
}
