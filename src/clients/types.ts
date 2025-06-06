// src/clients/types.ts

/**
 * --------- Shared Utility Types ---------
 */

/** Generic dictionary type */
export type Dict<T = unknown> = Record<string, T>;

/**
 * ContainerRuntime: a fully‐generic, strongly‐typed interface for any
 * container runtime. Each runtime specialization will supply its own
 * Create/Inspect request+response types, etc.
 */
export interface ContainerRuntime<
  /** Create‐request payload */
  CreateReq = unknown,
  /** Create‐response payload */
  CreateRes = unknown,
  /** Inspect‐request parameter (usually a string name/ID) */
  InspectReq = string,
  /** Inspect‐response payload */
  InspectRes = unknown,
  /** Start‐request parameter (usually a string name/ID) */
  StartReq = string,
  /** Start‐response payload */
  StartRes = unknown,
  /** Stop‐request parameter (usually a string name/ID) */
  StopReq = string,
  /** Stop‐response payload */
  StopRes = unknown,
> {
  /** List all “instances” (containers, pods, etc.) */
  list(): Promise<unknown[]>;

  /** Create a new “instance” (container, pod, etc.) */
  create(options: CreateReq): Promise<CreateRes>;

  /** Inspect a single “instance” by ID or name */
  inspect(id: InspectReq): Promise<InspectRes>;

  /** Start a “instance” by ID or name */
  start(id: StartReq): Promise<StartRes>;

  /** Stop a “instance” by ID or name */
  stop(id: StopReq): Promise<StopRes>;

  /** Restart a “instance” by ID or name */
  restart(id: StartReq & StopReq): Promise<StartRes>;

  /** Remove (delete) an “instance” by ID or name */
  remove(id: string): Promise<void>;

  /** Fetch logs (stdout+stderr) for an “instance” by ID or name */
  logs(id: string): Promise<string>;
}

/**
 * --------- Docker & Podman ---------
 */

export interface DockerCreateRequest {
  Image: string;
  Cmd?: string[];
  Env?: string[];
  HostConfig?: Dict;
  [key: string]: unknown;
}

export interface DockerCreateResponse {
  id: string;
  [key: string]: unknown;
}

export interface DockerInspectResponse {
  id: string;
  name?: string;
  state?: Dict;
  image?: string;
  created?: string;
  [key: string]: unknown;
}

export type DockerClientType = ContainerRuntime<
  DockerCreateRequest,
  DockerCreateResponse,
  string,
  DockerInspectResponse,
  string,
  void,
  string,
  void
>;

/**
 * --------- LXD ---------
 */

export interface LxdCreateRequest {
  name: string;
  source: {
    type: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface LxdCreateResponse {
  type: string;
  status: string;
  status_code: number;
  operation: string;
  [key: string]: unknown;
}

export interface LxdInspectResponse {
  type: string;
  status: string;
  status_code: number;
  operation: string;
  metadata: {
    name: string;
    status: string;
    stateful: boolean;
    description?: string;
    devices?: Record<string, unknown>;
    ephemeral: boolean;
    profiles?: string[];
    created_at?: string;
    expanded_config?: Record<string, unknown>;
    [key: string]: unknown;
  };
  etag?: string;
  [key: string]: unknown;
}

export type LxdClientType = ContainerRuntime<
  LxdCreateRequest,
  LxdCreateResponse,
  string,
  LxdInspectResponse,
  string,
  void,
  string,
  void
>;

/**
 * --------- Kubernetes ---------
 *
 * We pull in V1Pod, V1PodSpec, V1ObjectMeta, V1Status, V1PodList directly
 * from @kubernetes/client-node, so that our type definitions exactly match
 * the Kubernetes API objects. We also carve out a “create‐only” version that
 * omits server‐populated fields.
 */

import type {
  V1ObjectMeta,
  V1Pod,
  V1PodList,
  V1PodSpec,
} from "kubernetes-node";

/**
 * When creating a Pod, the server will populate `.status`. We only
 * require `metadata` and `spec`. This makes `PodCreateRequest` safer.
 */
export interface KubernetesPodCreateRequest {
  metadata: V1ObjectMeta & { name: string };
  spec: V1PodSpec;
  /**
   * Any other top-level V1Pod fields are disallowed on creation
   * (e.g. status, etc).
   */
}

/** The API always returns a full V1Pod, with metadata, spec, and status */
export type KubernetesPodResponse = V1Pod;

/** When listing, the API returns V1PodList */
export type KubernetesPodListResponse = V1PodList;

/** Delete (stop) a Pod returns a V1Status */
export type KubernetesDeleteResponse = V1Pod;

/**
 * KubernetesClientType ties all the above together:
 * - create(...) takes a `KubernetesPodCreateRequest`
 * - create(...) returns a full `KubernetesPodResponse`
 * - inspect(...) returns a full `KubernetesPodResponse`
 * - stop(...) returns `KubernetesDeleteResponse`
 * - list(...) returns an array of `V1Pod` from `V1PodList.items`
 */
export type KubernetesClientType = ContainerRuntime<
  KubernetesPodCreateRequest,
  KubernetesPodResponse,
  string,
  KubernetesPodResponse,
  string,
  void,
  string,
  KubernetesDeleteResponse
>;

/**
 * --------- Containerd ---------
 *
 * We leave Containerd’s own types as they are, since they come from
 * “containerd”’s TypeScript declarations directly.
 */

import type { Client as ContainerdClientLib } from "containerd";

type ContainerdService = ContainerdClientLib["containers"];

export type ContainerdCreateRequest = Parameters<
  ContainerdService["create"]
>[0];
export type ContainerdCreateResponse = Awaited<
  ReturnType<ContainerdService["create"]>
>;
export type ContainerdInspectRequest = Parameters<ContainerdService["get"]>[0];
export type ContainerdInspectResponse = Awaited<
  ReturnType<ContainerdService["get"]>
>;
export type ContainerdListRequest = Parameters<ContainerdService["list"]>[0];
export type ContainerdListResponse = Awaited<
  ReturnType<ContainerdService["list"]>
>["containers"];
export type ContainerdDeleteRequest = Parameters<
  ContainerdService["delete"]
>[0];
export type ContainerdDeleteResponse = Awaited<
  ReturnType<ContainerdService["delete"]>
>;

export type ContainerdClientType = ContainerRuntime<
  ContainerdCreateRequest,
  ContainerdCreateResponse,
  string,
  ContainerdInspectResponse,
  string,
  void,
  string,
  void
>;

/**
 * --------- Abstract Runtimes & Options ---------
 */

export type RuntimeType =
  | "docker"
  | "podman"
  | "kubernetes"
  | "containerd"
  | "lxd";

export type ClientOptions = Dict;

/**
 * --------- UnimplementedError Helper ---------
 */

export class UnimplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not implemented by this runtime client.`);
    this.name = "UnimplementedError";
  }
}
