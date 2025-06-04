// src/permissions/constants.ts

import { ContainerPlatform } from "jsr:@ggpwnkthx/infra-sense@0.1.8";
import { getKubeConfigPath } from "./utils.ts";

/**
 * Describes a single socket + the HTTP‐API operations (status, start, stop, create)
 * for container platforms that support raw‐HTTP over Unix‐socket.
 */
export interface SocketPathInfo {
  /** Filesystem path to the Unix socket. */
  path: string;

  /**
   * For this socket, how to construct each operation:
   * - status → GET  /containers/{id}/json
   * - start  → POST /containers/{id}/start
   * - stop   → POST /containers/{id}/stop
   * - create → POST /containers/create?name={id} with JSON body { Image: ... }
   */
  operations: {
    status: (id: string) => { method: string; url: string };
    start: (id: string) => { method: string; url: string };
    stop: (id: string) => { method: string; url: string };
    create: (
      id: string,
      image: string,
    ) => { method: string; url: string; body: unknown };
  };
}

/**
 * Mapping from each ContainerPlatform to an array of possible SocketPathInfo entries.
 * If the array is empty, no socket‐based fallback exists; only CLI is supported.
 *
 * - For Docker/Podman‐compatible platforms, we point at the local Docker‐Engine or Podman REST API socket.
 * - For other platforms (CRI, containerd, etc.), the array is still present but with "operations" that throw.
 */
export const SOCKET_PATHS: Record<ContainerPlatform, SocketPathInfo[]> = {
  [ContainerPlatform.Host]: [],

  [ContainerPlatform.Docker]: [
    {
      path: "/var/run/docker.sock",
      operations: {
        status: (id: string) => ({
          method: "GET",
          url: `/containers/${id}/json`,
        }),
        start: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/start`,
        }),
        stop: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/stop`,
        }),
        create: (id: string, image: string) => ({
          method: "POST",
          url: `/containers/create?name=${encodeURIComponent(id)}`,
          body: { Image: image },
        }),
      },
    },
  ],

  [ContainerPlatform.DockerCgroup]: [
    {
      path: "/var/run/docker.sock",
      operations: {
        status: (id: string) => ({
          method: "GET",
          url: `/containers/${id}/json`,
        }),
        start: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/start`,
        }),
        stop: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/stop`,
        }),
        create: (id: string, image: string) => ({
          method: "POST",
          url: `/containers/create?name=${encodeURIComponent(id)}`,
          body: { Image: image },
        }),
      },
    },
  ],

  [ContainerPlatform.KubernetesDocker]: [
    // If Docker is available via socket in Kubernetes
    {
      path: "/var/run/docker.sock",
      operations: {
        status: (id: string) => ({
          method: "GET",
          url: `/containers/${id}/json`,
        }),
        start: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/start`,
        }),
        stop: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/stop`,
        }),
        create: (id: string, image: string) => ({
          method: "POST",
          url: `/containers/create?name=${encodeURIComponent(id)}`,
          body: { Image: image },
        }),
      },
    },
    // Kubernetes CLI (kubeconfig) has no direct socket for HTTP container API
    {
      path: getKubeConfigPath(),
      operations: {
        status: (_: string) => {
          throw new Error(
            "Socket‐based status not supported for Kubernetes via kubeconfig",
          );
        },
        start: (_: string) => {
          throw new Error(
            "Socket‐based start not supported for Kubernetes via kubeconfig",
          );
        },
        stop: (_: string) => {
          throw new Error(
            "Socket‐based stop not supported for Kubernetes via kubeconfig",
          );
        },
        create: (_: string, _img: string) => {
          throw new Error(
            "Socket‐based create not supported for Kubernetes via kubeconfig",
          );
        },
      },
    },
  ],

  [ContainerPlatform.Podman]: [
    {
      path: "/run/podman/podman.sock",
      operations: {
        status: (id: string) => ({
          method: "GET",
          url: `/containers/${id}/json`,
        }),
        start: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/start`,
        }),
        stop: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/stop`,
        }),
        create: (id: string, image: string) => ({
          method: "POST",
          url: `/containers/create?name=${encodeURIComponent(id)}`,
          body: { Image: image },
        }),
      },
    },
    {
      path: "/var/run/podman/podman.sock",
      operations: {
        status: (id: string) => ({
          method: "GET",
          url: `/containers/${id}/json`,
        }),
        start: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/start`,
        }),
        stop: (id: string) => ({
          method: "POST",
          url: `/containers/${id}/stop`,
        }),
        create: (id: string, image: string) => ({
          method: "POST",
          url: `/containers/create?name=${encodeURIComponent(id)}`,
          body: { Image: image },
        }),
      },
    },
  ],

  [ContainerPlatform.CRIO]: [
    {
      path: "/var/run/crio/crio.sock",
      operations: {
        status: (_: string) => {
          throw new Error("Socket‐based status not implemented for CRIO");
        },
        start: (_: string) => {
          throw new Error("Socket‐based start not implemented for CRIO");
        },
        stop: (_: string) => {
          throw new Error("Socket‐based stop not implemented for CRIO");
        },
        create: (_: string, _img: string) => {
          throw new Error("Socket‐based create not implemented for CRIO");
        },
      },
    },
  ],

  [ContainerPlatform.KubernetesCriO]: [
    {
      path: getKubeConfigPath(),
      operations: {
        status: (_: string) => {
          throw new Error(
            "Socket‐based status not supported for Kubernetes via kubeconfig",
          );
        },
        start: (_: string) => {
          throw new Error(
            "Socket‐based start not supported for Kubernetes via kubeconfig",
          );
        },
        stop: (_: string) => {
          throw new Error(
            "Socket‐based stop not supported for Kubernetes via kubeconfig",
          );
        },
        create: (_: string, _img: string) => {
          throw new Error(
            "Socket‐based create not supported for Kubernetes via kubeconfig",
          );
        },
      },
    },
    {
      path: "/var/run/crio/crio.sock",
      operations: {
        status: (_: string) => {
          throw new Error("Socket‐based status not implemented for CRIO");
        },
        start: (_: string) => {
          throw new Error("Socket‐based start not implemented for CRIO");
        },
        stop: (_: string) => {
          throw new Error("Socket‐based stop not implemented for CRIO");
        },
        create: (_: string, _img: string) => {
          throw new Error("Socket‐based create not implemented for CRIO");
        },
      },
    },
  ],

  [ContainerPlatform.KubernetesOther]: [
    {
      path: getKubeConfigPath(),
      operations: {
        status: (_: string) => {
          throw new Error(
            "Socket‐based status not supported for Kubernetes via kubeconfig",
          );
        },
        start: (_: string) => {
          throw new Error(
            "Socket‐based start not supported for Kubernetes via kubeconfig",
          );
        },
        stop: (_: string) => {
          throw new Error(
            "Socket‐based stop not supported for Kubernetes via kubeconfig",
          );
        },
        create: (_: string, _img: string) => {
          throw new Error(
            "Socket‐based create not supported for Kubernetes via kubeconfig",
          );
        },
      },
    },
    {
      path: "/run/containerd/containerd.sock",
      operations: {
        status: (_: string) => {
          throw new Error(
            "Socket‐based status not implemented for containerd via HTTP",
          );
        },
        start: (_: string) => {
          throw new Error(
            "Socket‐based start not implemented for containerd via HTTP",
          );
        },
        stop: (_: string) => {
          throw new Error(
            "Socket‐based stop not implemented for containerd via HTTP",
          );
        },
        create: (_: string, _img: string) => {
          throw new Error(
            "Socket‐based create not implemented for containerd via HTTP",
          );
        },
      },
    },
  ],

  [ContainerPlatform.Containerd]: [
    {
      path: "/run/containerd/containerd.sock",
      operations: {
        status: (_: string) => {
          throw new Error(
            "Socket‐based status not implemented for containerd via HTTP",
          );
        },
        start: (_: string) => {
          throw new Error(
            "Socket‐based start not implemented for containerd via HTTP",
          );
        },
        stop: (_: string) => {
          throw new Error(
            "Socket‐based stop not implemented for containerd via HTTP",
          );
        },
        create: (_: string, _img: string) => {
          throw new Error(
            "Socket‐based create not implemented for containerd via HTTP",
          );
        },
      },
    },
  ],

  [ContainerPlatform.Rkt]: [
    {
      path: "/var/lib/rkt",
      operations: {
        status: (_: string) => {
          throw new Error("Socket‐based status not implemented for Rkt");
        },
        start: (_: string) => {
          throw new Error("Socket‐based start not implemented for Rkt");
        },
        stop: (_: string) => {
          throw new Error("Socket‐based stop not implemented for Rkt");
        },
        create: (_: string, _img: string) => {
          throw new Error("Socket‐based create not implemented for Rkt");
        },
      },
    },
  ],

  [ContainerPlatform.LXCLXD]: [
    {
      path: "/var/snap/lxd/common/lxd/unix.socket",
      operations: {
        status: (_: string) => {
          throw new Error(
            "Socket‐based status not implemented for LXC/LXD via HTTP",
          );
        },
        start: (_: string) => {
          throw new Error(
            "Socket‐based start not implemented for LXC/LXD via HTTP",
          );
        },
        stop: (_: string) => {
          throw new Error(
            "Socket‐based stop not implemented for LXC/LXD via HTTP",
          );
        },
        create: (_: string, _img: string) => {
          throw new Error(
            "Socket‐based create not implemented for LXC/LXD via HTTP",
          );
        },
      },
    },
    {
      path: "/var/lib/lxd/unix.socket",
      operations: {
        status: (_: string) => {
          throw new Error(
            "Socket‐based status not implemented for LXC/LXD via HTTP",
          );
        },
        start: (_: string) => {
          throw new Error(
            "Socket‐based start not implemented for LXC/LXD via HTTP",
          );
        },
        stop: (_: string) => {
          throw new Error(
            "Socket‐based stop not implemented for LXC/LXD via HTTP",
          );
        },
        create: (_: string, _img: string) => {
          throw new Error(
            "Socket‐based create not implemented for LXC/LXD via HTTP",
          );
        },
      },
    },
  ],

  [ContainerPlatform.SystemdNspawn]: [], // no socket fallback
};
