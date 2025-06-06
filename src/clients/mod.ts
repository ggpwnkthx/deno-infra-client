// src/clients/mod.ts

import type { CreateOptions } from "./types.ts";
import { DockerClient } from "./docker.ts";
import { PodmanClient } from "./podman.ts";
import { KubernetesClient } from "./kubernetes.ts";
import { ContainerdClient } from "./containerd.ts";
import { LxdClient } from "./lxd.ts";
import {
  type ContainerPlatform,
  PlatformType,
  Runtime,
} from "@ggpwnkthx/infra-sense";
import type { ContainerRuntime } from "./types.ts";

/**
 * Create a container runtime client based on the detected ContainerPlatform.
 * All clients now conform to the unified ContainerRuntime interface.
 */
export function clientFactory(
  platform: ContainerPlatform,
  opts: CreateOptions = {},
): ContainerRuntime {
  switch (platform.type) {
    case PlatformType.Kubernetes:
      return new KubernetesClient(opts);

    case PlatformType.Standalone:
      switch (platform.runtime) {
        case Runtime.Docker:
          return new DockerClient(opts);
        case Runtime.Podman:
          return new PodmanClient(opts);
        case Runtime.Containerd:
          return new ContainerdClient(opts);
        case Runtime.LXC:
          return new LxdClient(opts);
        default:
          throw new Error(
            `Unsupported standalone runtime: ${platform.runtime}`,
          );
      }

    case PlatformType.Host:
      throw new Error(
        "Host platform detected; no container runtime client available.",
      );

    default:
      throw new Error(`Unsupported platform type: ${platform.type}`);
  }
}
