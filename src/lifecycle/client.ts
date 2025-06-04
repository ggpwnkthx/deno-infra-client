// src/lifecycle/client.ts

import { ContainerPlatform } from "jsr:@ggpwnkthx/infra-sense@0.1.8";
import { checkRunPermission } from "../permissions/run.ts";
import { checkReadPermissions } from "../permissions/read.ts";
import { checkCommandCapability } from "../permissions/command.ts";
import { SOCKET_PATHS, type SocketPathInfo } from "../permissions/constants.ts";
import type { PermissionEntry } from "../permissions/types.ts";
import type { LifecycleClient } from "./types.ts";
import { isExecutable, runSubprocess } from "./utils.ts";
import { getArgBuilders, getBinName } from "./builders.ts";

/**
 * Wrap a raw HTTP fetch‐over‐socket response into a Deno.CommandOutput shape.
 */
async function httpToCommandOutput(
  response: Response,
): Promise<Deno.CommandOutput> {
  const arrayBuffer = await response.arrayBuffer();
  const bodyBytes = new Uint8Array(arrayBuffer);
  const code = response.ok ? 0 : response.status;
  return {
    code,
    success: response.ok,
    stdout: bodyBytes,
    stderr: new Uint8Array(),
    signal: null,
  };
}

/**
 * A LifecycleClient that speaks to the container runtime via CLI binary.
 */
class CliLifecycleClient implements LifecycleClient {
  platform: ContainerPlatform;
  private binName: string;
  private statusArgs: (id: string) => string[];
  private startArgs: (id: string) => string[];
  private stopArgs: (id: string) => string[];
  private createArgs: (id: string, image: string) => string[] | null;

  constructor(
    platform: ContainerPlatform,
    binName: string,
    argBuilders: {
      statusArgs: (id: string) => string[];
      startArgs: (id: string) => string[];
      stopArgs: (id: string) => string[];
      createArgs: (id: string, image: string) => string[] | null;
    },
  ) {
    this.platform = platform;
    this.binName = binName;
    this.statusArgs = argBuilders.statusArgs;
    this.startArgs = argBuilders.startArgs;
    this.stopArgs = argBuilders.stopArgs;
    this.createArgs = argBuilders.createArgs;
  }

  async status(containerId: string): Promise<Deno.CommandOutput> {
    const args = this.statusArgs(containerId);
    const permCheck = await checkCommandCapability(this.binName, args);
    if (permCheck.state !== "granted") {
      throw new Error(
        `Cannot query status: ${permCheck.state}` +
          (permCheck.message ? ` (${permCheck.message})` : ""),
      );
    }
    return await runSubprocess(this.binName, args);
  }

  async start(containerId: string): Promise<Deno.CommandOutput> {
    const args = this.startArgs(containerId);
    const permCheck = await checkCommandCapability(this.binName, args);
    if (permCheck.state !== "granted") {
      throw new Error(
        `Cannot start container: ${permCheck.state}` +
          (permCheck.message ? ` (${permCheck.message})` : ""),
      );
    }
    return await runSubprocess(this.binName, args);
  }

  async stop(containerId: string): Promise<Deno.CommandOutput> {
    const args = this.stopArgs(containerId);
    const permCheck = await checkCommandCapability(this.binName, args);
    if (permCheck.state !== "granted") {
      throw new Error(
        `Cannot stop container: ${permCheck.state}` +
          (permCheck.message ? ` (${permCheck.message})` : ""),
      );
    }
    return await runSubprocess(this.binName, args);
  }

  async create(
    containerId: string,
    image: string,
  ): Promise<Deno.CommandOutput> {
    const args = this.createArgs(containerId, image);
    if (!args) {
      throw new Error(
        `Create-container not supported on platform ${this.platform}`,
      );
    }
    const permCheck = await checkCommandCapability(this.binName, args);
    if (permCheck.state !== "granted") {
      throw new Error(
        `Cannot create container: ${permCheck.state}` +
          (permCheck.message ? ` (${permCheck.message})` : ""),
      );
    }
    return await runSubprocess(this.binName, args);
  }
}

/**
 * A LifecycleClient that speaks to the container runtime via HTTP over a Unix socket.
 * Uses Deno.createHttpClient({ socketPath }) + fetch("http://localhost/...").
 */
class SocketLifecycleClient implements LifecycleClient {
  platform: ContainerPlatform;
  private client: Deno.HttpClient;
  private ops: NonNullable<SocketPathInfo["operations"]>;

  constructor(platform: ContainerPlatform, info: SocketPathInfo) {
    this.platform = platform;
    this.client = Deno.createHttpClient({
      proxy: {
        transport: "unix",
        path: info.path,
      },
    });
    this.ops = info.operations;
  }

  async status(containerId: string): Promise<Deno.CommandOutput> {
    const { method, url } = this.ops.status(containerId);
    const resp = await fetch(`http://localhost${url}`, {
      method,
      client: this.client,
    });
    return await httpToCommandOutput(resp);
  }

  async start(containerId: string): Promise<Deno.CommandOutput> {
    const { method, url } = this.ops.start(containerId);
    const resp = await fetch(`http://localhost${url}`, {
      method,
      client: this.client,
    });
    return await httpToCommandOutput(resp);
  }

  async stop(containerId: string): Promise<Deno.CommandOutput> {
    const { method, url } = this.ops.stop(containerId);
    const resp = await fetch(`http://localhost${url}`, {
      method,
      client: this.client,
    });
    return await httpToCommandOutput(resp);
  }

  async create(
    containerId: string,
    image: string,
  ): Promise<Deno.CommandOutput> {
    const { method, url, body } = this.ops.create(containerId, image);
    const resp = await fetch(`http://localhost${url}`, {
      method,
      client: this.client,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await httpToCommandOutput(resp);
  }
}

/**
 * Factory: Attempt to create a LifecycleClient for a given platform.
 * 1) If platform === Host → return a no-op client.
 * 2) Ensure “run” permission is granted at all.
 * 3) Attempt to find and use the CLI binary (if present).
 * 4) Otherwise, fallback to a socket‐based client (if any SocketPathInfo is readable).
 * 5) If neither is available, throw.
 */
export async function getLifecycleClient(
  platform: ContainerPlatform,
): Promise<LifecycleClient> {
  // “Host” is a no-op platform: nothing to start/stop/create.
  if (platform === ContainerPlatform.Host) {
    const noop = (_a: string, _b?: string) =>
      Promise.resolve({
        code: 0,
        success: true,
        stdout: new Uint8Array(),
        stderr: new Uint8Array(),
      } as Deno.CommandOutput);
    return {
      platform,
      status: noop,
      start: noop,
      stop: noop,
      create: noop,
    };
  }

  // 1) Ensure we have “run” permission (otherwise subprocess fails).
  const runPerm: PermissionEntry = await checkRunPermission();
  if (runPerm.state !== "granted") {
    throw new Error(
      `Cannot create LifecycleClient: “run” permission is ${runPerm.state}` +
        (runPerm.message ? ` (${runPerm.message})` : ""),
    );
  }

  // 2) Check read permissions for any socket/config paths
  const candidateInfos: SocketPathInfo[] = SOCKET_PATHS[platform] ?? [];
  const candidatePaths = candidateInfos.map((info) => info.path);
  const readEntries = await checkReadPermissions(candidatePaths);
  // Pair each PermissionEntry back to its SocketPathInfo
  const readableInfos: SocketPathInfo[] = [];
  for (let i = 0; i < readEntries.length; i++) {
    if (readEntries[i].state === "granted") {
      readableInfos.push(candidateInfos[i]);
    }
  }
  const anySocketReadable = readableInfos.length > 0;

  // 3) Decide which CLI binary to use (if present)
  const binName = getBinName(platform);
  const binExists = await isExecutable(binName);

  if (binExists) {
    const argBuilders = getArgBuilders(platform);
    return new CliLifecycleClient(platform, binName, argBuilders);
  }

  // 4) No CLI found → attempt socket fallback only if any socket is readable
  if (!anySocketReadable) {
    throw new Error(
      `Neither binary "${binName}" found nor any socket is readable for ${platform}`,
    );
  }

  // Pick the first readable socket
  const selectedSocketInfo = readableInfos[0];
  return new SocketLifecycleClient(platform, selectedSocketInfo);
}
