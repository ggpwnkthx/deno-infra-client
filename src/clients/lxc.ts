// src/clients/lxc.ts

import type {
  ClientOptions,
  LxcClientType,
  LxcCreateRequest,
  LxcCreateResponse,
  LxcInspectResponse,
} from "./types.ts";

export class LxcClient implements LxcClientType {
  private baseDir: string;

  constructor(opts: ClientOptions = {}) {
    this.baseDir = (opts.baseDir as string) ?? "/var/lib/lxc";
  }

  private async runCommand(cmd: string[], cwd?: string): Promise<string> {
    const command = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      cwd,
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stdout, stderr } = await command.output();
    const output = new TextDecoder().decode(stdout);
    const errorOutput = new TextDecoder().decode(stderr);

    if (code !== 0) {
      throw new Error(`Command failed with code ${code}: ${errorOutput}`);
    }

    return output.trim();
  }

  /** Create a new LXC container */
  async create(options: LxcCreateRequest): Promise<LxcCreateResponse> {
    const name = options.name;
    const template = options.template ?? "download";
    const output = await this.runCommand([
      "lxc-create",
      "-n",
      name,
      "-t",
      template,
    ]);
    return { name, output };
  }

  /** Inspect a container (lxc-info) */
  async inspect(name: string): Promise<LxcInspectResponse> {
    const output = await this.runCommand(["lxc-info", "-n", name]);
    return { output };
  }

  /** Start a container */
  async start(name: string): Promise<string> {
    return await this.runCommand(["lxc-start", "-n", name]);
  }

  /** Stop a container */
  async stop(name: string): Promise<string> {
    return await this.runCommand(["lxc-stop", "-n", name]);
  }

  /** List all LXC containers (names) */
  async list(): Promise<unknown[]> {
    // `lxc-ls --fancy` could provide more detail; `lxc-ls` alone lists names
    const output = await this.runCommand(["lxc-ls"]);
    // `lxc-ls` outputs space-separated names
    if (!output) {
      return [];
    }
    return output.split(/\s+/).filter((n) => n.length > 0);
  }

  /** Restart an LXC container */
  async restart(name: string): Promise<string> {
    await this.stop(name);
    return this.start(name);
  }

  /** Remove (destroy) an LXC container */
  async remove(name: string): Promise<void> {
    await this.runCommand(["lxc-destroy", "-n", name]);
  }

  /** Fetch logs (not directly supported via CLI; throw) */
  logs(_: string): Promise<string> {
    throw new Error("LXC: logs operation is not supported in this client.");
  }
}
