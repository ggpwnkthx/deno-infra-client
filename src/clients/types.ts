// src/clients/types.ts

/** --------- Shared Utility Types --------- **/

/** Helper for unknown object maps */
export type Dict<T = unknown> = Record<string, T>;

/** Standard API response shape (for "inspect"-like calls) */
export interface ContainerInfoBase {
  id: string;
  name?: string;
  state?: Dict;
  image?: string;
  created?: string;
  [key: string]: unknown;
}

/** Generic container creation result */
export interface CreateResponseBase {
  id: string;
  warnings?: string[];
  [key: string]: unknown;
}

/** Generic error result (if API returns error objects) */
export interface ApiError {
  message: string;
  code?: number | string;
  [key: string]: unknown;
}

/** --------- Docker & Podman --------- **/

export interface DockerCreateRequest {
  Image: string;
  Cmd?: string[];
  Env?: string[];
  HostConfig?: Dict;
  [key: string]: unknown;
}

export interface DockerCreateResponse extends CreateResponseBase {}

export interface DockerInspectResponse extends ContainerInfoBase {}

export type PodmanCreateRequest = DockerCreateRequest;
export type PodmanCreateResponse = DockerCreateResponse;
export type PodmanInspectResponse = DockerInspectResponse;

/** --------- LXC --------- **/

export interface LxcCreateRequest {
  name: string;
  template?: string; // E.g., "download", "ubuntu"
  [key: string]: unknown;
}

export interface LxcCreateResponse {
  name: string;
  output: string; // Command output
}

export interface LxcInspectResponse {
  output: string; // lxc-info output
}

/** --------- LXD --------- **/

// LXD API is more RESTful, but similar to Docker for basic ops

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
  metadata: Dict;
  [key: string]: unknown;
}

/** --------- Kubernetes --------- **/

// K8s is more abstract: "create" is always a Pod spec, "inspect" is a Pod status object

export interface KubernetesPodSpec {
  metadata: { name: string; [k: string]: unknown };
  spec: Dict;
  [key: string]: unknown;
}
export interface KubernetesPodResponse {
  metadata: { name: string; [k: string]: unknown };
  status?: Dict;
  [key: string]: unknown;
}

/** --------- Containerd --------- **/

// Containerd (and CRI-O) usually follow a protobuf schema, here's a practical abstraction

export interface ContainerdCreateRequest {
  id: string;
  image: string;
  labels?: Dict<string>;
  [key: string]: unknown;
}

export interface ContainerdCreateResponse extends CreateResponseBase {}

export interface ContainerdInspectResponse extends ContainerInfoBase {}

/** --------- CRI-O --------- **/

// CRI-O is very similar to containerd (both are CRI), so reuse those types

export type CrioCreateRequest = ContainerdCreateRequest;
export type CrioCreateResponse = ContainerdCreateResponse;
export type CrioInspectResponse = ContainerdInspectResponse;

/** --------- Abstract ContainerRuntime --------- **/

/**
 * Generic container lifecycle interface.
 * By default, each op can have different request/response typing.
 */
export interface ContainerRuntime<
  CreateReq = unknown,
  CreateRes = unknown,
  InspectReq = string,
  InspectRes = unknown,
  StartReq = string,
  StartRes = unknown,
  StopReq = string,
  StopRes = unknown,
> {
  checkPermissions(): Promise<boolean>;
  create(options: CreateReq): Promise<CreateRes>;
  inspect(id: InspectReq): Promise<InspectRes>;
  start(id: StartReq): Promise<StartRes>;
  stop(id: StopReq): Promise<StopRes>;
}

/** --------- Supported Runtimes & Options --------- **/

export type RuntimeType =
  | "docker"
  | "podman"
  | "kubernetes"
  | "crio"
  | "containerd"
  | "lxc"
  | "lxd";

export type ClientOptions = Dict;

/** --------- Type Aliases for Platform Clients --------- **/

// For maximal DRY and type safety, client implementations can import these directly:

export type DockerClientType = ContainerRuntime<
  DockerCreateRequest,
  DockerCreateResponse,
  string,
  DockerInspectResponse,
  string,
  unknown,
  string,
  unknown
>;

export type PodmanClientType = ContainerRuntime<
  PodmanCreateRequest,
  PodmanCreateResponse,
  string,
  PodmanInspectResponse,
  string,
  unknown,
  string,
  unknown
>;

export type LxcClientType = ContainerRuntime<
  LxcCreateRequest,
  LxcCreateResponse,
  string,
  LxcInspectResponse,
  string,
  string,
  string,
  string
>;

export type LxdClientType = ContainerRuntime<
  LxdCreateRequest,
  LxdCreateResponse,
  string,
  LxdInspectResponse,
  string,
  unknown,
  string,
  unknown
>;

export type KubernetesClientType = ContainerRuntime<
  KubernetesPodSpec,
  KubernetesPodResponse,
  string,
  KubernetesPodResponse,
  string,
  never, // start not supported
  string,
  unknown
>;

export type ContainerdClientType = ContainerRuntime<
  ContainerdCreateRequest,
  ContainerdCreateResponse,
  string,
  ContainerdInspectResponse,
  string,
  unknown,
  string,
  unknown
>;

export type CrioClientType = ContainerRuntime<
  CrioCreateRequest,
  CrioCreateResponse,
  string,
  CrioInspectResponse,
  string,
  unknown,
  string,
  unknown
>;
