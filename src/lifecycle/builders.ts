// src/lifecycle/builders.ts

import { ContainerPlatform } from "jsr:@ggpwnkthx/infra-sense@0.1.8";

/**
 * Determine the CLI binary name for a given container platform.
 */
export function getBinName(platform: ContainerPlatform): string {
  switch (platform) {
    case ContainerPlatform.Docker:
    case ContainerPlatform.DockerCgroup:
    case ContainerPlatform.KubernetesDocker:
      return "docker";
    case ContainerPlatform.Podman:
      return "podman";
    case ContainerPlatform.CRIO:
    case ContainerPlatform.KubernetesCriO:
      return "crio";
    case ContainerPlatform.KubernetesOther:
    case ContainerPlatform.Containerd:
      return "ctr";
    case ContainerPlatform.Rkt:
      return "rkt";
    case ContainerPlatform.LXCLXD:
      return "lxc";
    case ContainerPlatform.SystemdNspawn:
      return "machinectl";
    default:
      return "docker";
  }
}

/**
 * Returns argument builder functions for status, start, stop, and create operations.
 */
export function getArgBuilders(platform: ContainerPlatform): {
  statusArgs: (id: string) => string[];
  startArgs: (id: string) => string[];
  stopArgs: (id: string) => string[];
  createArgs: (id: string, image: string) => string[] | null;
} {
  let statusArgs: (id: string) => string[];
  let startArgs: (id: string) => string[];
  let stopArgs: (id: string) => string[];
  let createArgs: (id: string, image: string) => string[] | null;

  switch (platform) {
    case ContainerPlatform.Docker:
    case ContainerPlatform.KubernetesDocker:
    case ContainerPlatform.DockerCgroup:
      statusArgs = (id) => ["inspect", id];
      startArgs = (id) => ["start", id];
      stopArgs = (id) => ["stop", id];
      createArgs = (id, image) => ["create", "--name", id, image];
      break;

    case ContainerPlatform.Podman:
      statusArgs = (id) => ["inspect", id];
      startArgs = (id) => ["start", id];
      stopArgs = (id) => ["stop", id];
      createArgs = (id, image) => ["create", "--name", id, image];
      break;

    case ContainerPlatform.CRIO:
    case ContainerPlatform.KubernetesCriO:
      statusArgs = (id) => ["inspect", id];
      startArgs = (id) => ["start", id];
      stopArgs = (id) => ["stop", id];
      createArgs = (_) => null; // “create” not supported here
      break;

    case ContainerPlatform.Containerd:
    case ContainerPlatform.KubernetesOther:
      statusArgs = (id) => ["containers", "info", id];
      startArgs = (id) => ["containers", "start", id];
      stopArgs = (id) => ["containers", "stop", id];
      createArgs = (_) => null;
      break;

    case ContainerPlatform.Rkt:
      statusArgs = (id) => ["status", id];
      startArgs = (id) => ["run", id];
      stopArgs = (id) => ["stop", id];
      createArgs = (_) => null;
      break;

    case ContainerPlatform.LXCLXD:
      statusArgs = (id) => ["info", id];
      startArgs = (id) => ["start", id];
      stopArgs = (id) => ["stop", id];
      createArgs = (_) => null;
      break;

    case ContainerPlatform.SystemdNspawn:
      statusArgs = (id) => ["show", id];
      startArgs = (id) => ["start", id];
      stopArgs = (id) => ["stop", id];
      createArgs = (_) => null;
      break;

    default:
      // Fallback to Docker‐like
      statusArgs = (id) => ["inspect", id];
      startArgs = (id) => ["start", id];
      stopArgs = (id) => ["stop", id];
      createArgs = (id, image) => ["create", "--name", id, image];
      break;
  }

  return { statusArgs, startArgs, stopArgs, createArgs };
}
