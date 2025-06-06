// src/cli.ts

import { z } from "zod";
import { CLI, type CLIContext, CLIError } from "@ggpwnkthx/generic-cli";
import { detect } from "@ggpwnkthx/infra-sense";
import { clientFactory } from "./clients/mod.ts";
import type { ClientOptions, ContainerRuntime } from "./clients/types.ts";

/**
 * Helper: detect which container platform is in use and instantiate its client.
 * Throws if detection fails or if no supported runtime is found.
 */
async function getClient(
  ctx: CLIContext,
  opts: ClientOptions = {},
): Promise<ContainerRuntime> {
  const platform = await detect(ctx);
  return clientFactory(platform, opts);
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
  // You can override name/version here, or let CLI auto‐load from deno.json/deno.jsonc.
  const cli = new CLI({ name: "container-cli", version: "0.1.0" });

  //
  // detect
  //
  cli.registerCommand(
    ["detect"],
    async (_args, _flags, ctx) => {
      try {
        const platform = await detect(ctx);
        const client = clientFactory(platform);
        ctx.log({ platform, client });
      } catch (err) {
        throw new CLIError(`Detection failed: ${String(err)}`, 1);
      }
    },
    {
      description:
        "Scan the environment and print detected platform + client instance.",
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
      // At this point, `flags.data` is guaranteed to be a valid JSON string by Zod
      const { data } = flags as z.infer<typeof createFlagsSchema>;

      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch (err: any) {
        // This should never happen because the Zod schema already validated JSON,
        // but we guard just in case.
        throw new CLIError(`Cannot parse JSON from --data: ${err.message}`, 1);
      }

      try {
        const client = await getClient(ctx);
        const resp = await client.create(parsed);
        ctx.log({ resp });
      } catch (err) {
        throw new CLIError(`Create failed: ${String(err)}`, 1);
      }
    },
    {
      description:
        'Create a new container. Supply JSON via `--data`. E.g.: --data \'{"Image":"nginx:latest"}\'.',
      flagsSchema: createFlagsSchema,
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
        const res = await client.start(id);
        ctx.log({ res });
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
        const res = await client.stop(id);
        ctx.log({ res });
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
        const res = await client.restart(id);
        ctx.log({ res });
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

  // Finally, run the CLI with Deno.args
  await cli.run(Deno.args);
}

if (import.meta.main) {
  main();
}
