// src/clients/mod.ts

import type { ClientOptions, ContainerRuntime } from "./types.ts";
import { DockerClient } from "./docker.ts";
import { PodmanClient } from "./podman.ts";
import { KubernetesClient } from "./kubernetes.ts";
import { CrioClient } from "./crio.ts";
import { ContainerdClient } from "./containerd.ts";
// import { LxcClient } from "./lxc.ts";
import { LxdClient } from "./lxd.ts";
import {
  type ContainerPlatform,
  PlatformType,
  Runtime,
} from "@ggpwnkthx/infra-sense";

/**
 * Create a container runtime client based on the detected ContainerPlatform.
 *
 * @param platform   The detected platform (type + runtime) from infra-sense.
 * @param opts       Any ClientOptions to pass along to the chosen client.
 * @returns          An instance of a ContainerRuntime-implementing client.
 */
export function clientFactory(
  platform: ContainerPlatform,
  opts: ClientOptions = {},
): ContainerRuntime {
  switch (platform.type) {
    case PlatformType.Kubernetes:
      // When running under Kubernetes, always use the Kubernetes client.
      return new KubernetesClient(opts);
    case PlatformType.Standalone:
      // For standalone platforms, switch on the specific runtime.
      switch (platform.runtime) {
        case Runtime.Docker:
          return new DockerClient(opts);
        case Runtime.Podman:
          return new PodmanClient(opts);
        case Runtime.Crio:
          return new CrioClient(opts);
        case Runtime.Containerd:
          return new ContainerdClient(opts);
        case Runtime.LXC:
          // The infra-sense Runtime.LXC covers both LXC and LXD.
          // Choose LxdClient if you expect LXD behavior, or LxcClient otherwise.
          // Here, we'll instantiate LxdClient for LXC/LXD support by default.
          return new LxdClient(opts);
        default:
          throw new Error(
            `Unsupported standalone runtime: ${platform.runtime}`,
          );
      }

    case PlatformType.Host:
      // No container runtime is available on a pure host platform.
      throw new Error(
        "Host platform detected; no container runtime client available.",
      );

    default:
      throw new Error(`Unsupported platform type: ${platform.type}`);
  }
}
