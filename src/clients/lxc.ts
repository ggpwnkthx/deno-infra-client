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
    this.baseDir = opts.baseDir as string ?? "/var/lib/lxc";
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
  async checkPermissions(): Promise<boolean> {
    try {
      // Check CLI existence
      await this.runCommand(["lxc-ls", "--version"]);
      // Check readable access to base dir (list containers)
      await this.runCommand(["lxc-ls", "-1"], this.baseDir);
      return true;
    } catch (_e) {
      return false;
    }
  }
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
  async inspect(name: string): Promise<LxcInspectResponse> {
    const output = await this.runCommand(["lxc-info", "-n", name]);
    return { output };
  }
  async start(name: string): Promise<string> {
    return await this.runCommand(["lxc-start", "-n", name]);
  }
  async stop(name: string): Promise<string> {
    return await this.runCommand(["lxc-stop", "-n", name]);
  }
}
