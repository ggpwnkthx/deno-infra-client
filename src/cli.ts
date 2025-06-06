// src/cli.ts

import { z } from "zod";
import { CLI, type CLIContext, CLIError } from "@ggpwnkthx/generic-cli";
import { detect } from "@ggpwnkthx/infra-sense";
import { clientFactory } from "./clients/mod.ts";
import type { ClientOptions, ContainerRuntime } from "./clients/types.ts";

async function getClient(
  ctx: CLIContext,
  opts: ClientOptions = {},
): Promise<ContainerRuntime> {
  const platform = await detect(ctx);
  const client = clientFactory(platform, opts);
  // If the client is KubernetesClient, we need to call init():
  if ("init" in client && typeof (client as any).init === "function") {
    await (client as any).init();
  }
  return client;
}

// Define a Zod schema for the `create` command's flags
const createFlagsSchema = z.object({
  data: z
    .string()
    .describe("JSON-stringified create options")
    .refine((str: string) => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    }, "Must be valid JSON string"),
});

async function main() {
  const cli = new CLI({ name: "container-cli", version: "0.1.0" });

  //
  // detect
  //
  cli.registerCommand(
    ["detect"],
    async (_args, _flags, ctx) => {
      try {
        const platform = await detect(ctx);
        ctx.log({
          detected: {
            type: platform.type,
            runtime: platform.runtime,
          },
        });
      } catch (err) {
        throw new CLIError(`Detection failed: ${String(err)}`, 1);
      }
    },
    {
      description:
        "Scan the environment and print detected platform + runtime.",
    },
  );

  //
  // list
  //
  cli.registerCommand(
    ["list"],
    async (_args, _flags, ctx) => {
      try {
        const client = await getClient(ctx);
        const all = await client.list();
        ctx.log({ all });
      } catch (err) {
        throw new CLIError(`Failed to list containers: ${String(err)}`, 1);
      }
    },
    {
      description: "List all containers on the detected runtime.",
    },
  );

  //
  // create
  //
  cli.registerCommand(
    ["create"],
    async (_args, flags, ctx) => {
      const { data } = flags as z.infer<typeof createFlagsSchema>;
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch (err: any) {
        throw new CLIError(`Cannot parse JSON from --data: ${err.message}`, 1);
      }

      try {
        const client = await getClient(ctx);
        const resp = await client.create(parsed as any);
        ctx.log({ resp });
      } catch (err) {
        throw new CLIError(`Create failed: ${String(err)}`, 1);
      }
    },
    {
      description:
        'Create a new container. Supply JSON via `--data`. E.g.: --data \'{"Image":"nginx:latest"}\'.',
      examples: ['create --data \'{"Image":"nginx:latest"}\''],
    },
  );

  //
  // inspect
  //
  cli.registerCommand(
    ["inspect"],
    async (args, _flags, ctx) => {
      const id = args[0];
      if (!id) {
        throw new CLIError("Usage: inspect <containerId>", 1);
      }

      try {
        const client = await getClient(ctx);
        const info = await client.inspect(id);
        ctx.log({ info });
      } catch (err) {
        throw new CLIError(`Inspect failed: ${String(err)}`, 1);
      }
    },
    {
      description:
        "Inspect a single container by ID or name. Usage: inspect <containerId>",
    },
  );

  //
  // start
  //
  cli.registerCommand(
    ["start"],
    async (args, _flags, ctx) => {
      const id = args[0];
      if (!id) {
        throw new CLIError("Usage: start <containerId>", 1);
      }

      try {
        const client = await getClient(ctx);
        await client.start(id);
        ctx.log({ status: "started", id });
      } catch (err) {
        throw new CLIError(`Start failed: ${String(err)}`, 1);
      }
    },
    {
      description: "Start a container. Usage: start <containerId>",
    },
  );

  //
  // stop
  //
  cli.registerCommand(
    ["stop"],
    async (args, _flags, ctx) => {
      const id = args[0];
      if (!id) {
        throw new CLIError("Usage: stop <containerId>", 1);
      }

      try {
        const client = await getClient(ctx);
        await client.stop(id);
        ctx.log({ status: "stopped", id });
      } catch (err) {
        throw new CLIError(`Stop failed: ${String(err)}`, 1);
      }
    },
    {
      description: "Stop a container. Usage: stop <containerId>",
    },
  );

  //
  // restart
  //
  cli.registerCommand(
    ["restart"],
    async (args, _flags, ctx) => {
      const id = args[0];
      if (!id) {
        throw new CLIError("Usage: restart <containerId>", 1);
      }

      try {
        const client = await getClient(ctx);
        await client.restart(id);
        ctx.log({ status: "restarted", id });
      } catch (err) {
        throw new CLIError(`Restart failed: ${String(err)}`, 1);
      }
    },
    {
      description: "Restart a container. Usage: restart <containerId>",
    },
  );

  //
  // remove
  //
  cli.registerCommand(
    ["remove"],
    async (args, _flags, ctx) => {
      const id = args[0];
      if (!id) {
        throw new CLIError("Usage: remove <containerId>", 1);
      }

      try {
        const client = await getClient(ctx);
        await client.remove(id);
        ctx.log({ status: "removed", id });
      } catch (err) {
        throw new CLIError(`Remove failed: ${String(err)}`, 1);
      }
    },
    {
      description: "Remove (delete) a container. Usage: remove <containerId>",
    },
  );

  //
  // logs
  //
  cli.registerCommand(
    ["logs"],
    async (args, _flags, ctx) => {
      const id = args[0];
      if (!id) {
        throw new CLIError("Usage: logs <containerId>", 1);
      }

      try {
        const client = await getClient(ctx);
        const text = await client.logs(id);
        ctx.log(text);
      } catch (err) {
        throw new CLIError(`Logs failed: ${String(err)}`, 1);
      }
    },
    {
      description:
        "Fetch logs (stdout+stderr) for a container. Usage: logs <containerId>",
    },
  );

  await cli.run(Deno.args);
}

if (import.meta.main) {
  main();
}
