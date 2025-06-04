// src/cli.ts

import { parseArgs } from "jsr:@std/cli@1.0.19";
import {
  type ContainerPlatform,
  detect,
} from "jsr:@ggpwnkthx/infra-sense@0.1.8";
import { getProjectInfo, type ProjectInfo } from "./projectInfo.ts";
import { getLifecycleClient } from "./lifecycle/client.ts";
import type { LifecycleClient } from "./lifecycle/types.ts";

/**
 * Entry point for the CLI.
 */
async function main(args: string[]): Promise<void> {
  // Retrieve project metadata (name & version) for CLI usage/version display
  const { name, version }: ProjectInfo = await getProjectInfo();

  // Parse CLI flags: --help, --json, --verbose, --version
  const parsed = parseArgs(args, {
    boolean: ["help", "json", "verbose", "version"],
    default: { help: false, json: false, verbose: false, version: false },
  });

  // Handle --help: print usage and exit
  if (parsed.help) {
    console.log(
      `Usage: deno run --allow-env --allow-read --allow-run src/cli.ts [options]

Options:
  --version           Show version and exit.
  --help              Show this help message.
  --verbose           Print additional details.
  --json              Emit machine-readable JSON instead of human output.`,
    );
    Deno.exit(0);
  }

  // Handle --version: print project name and version and exit
  if (parsed.version) {
    console.log(`${name}@${version}`);
    Deno.exit(0);
  }

  // Reject any unknown positional arguments
  if (parsed._.length > 0) {
    console.error("Unknown argument(s):", parsed._);
    Deno.exit(1);
  }

  // 1) Detect the container platform
  let platform: ContainerPlatform;
  try {
    platform = await detect();
  } catch (err) {
    console.error("❌ Failed to detect container platform:", err);
    Deno.exit(1);
  }

  // 2) Attempt to create a LifecycleClient for this platform
  let client: LifecycleClient;
  try {
    client = await getLifecycleClient(platform);
  } catch (err) {
    console.error(
      `❌ Unable to construct lifecycle client for ${platform}:`,
      err,
    );
    Deno.exit(1);
  }

  // 3) Report capabilities
  // If --json flag is set, emit machine-readable JSON
  if (parsed.json) {
    const output = {
      platform,
      capabilities: {
        status: typeof client.status === "function"
          ? "available"
          : "unavailable",
        start: typeof client.start === "function" ? "available" : "unavailable",
        stop: typeof client.stop === "function" ? "available" : "unavailable",
        create: typeof client.create === "function"
          ? "available"
          : "unavailable",
      },
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Otherwise, human-readable output
  console.log(`Platform detected: ${platform}`);
  console.log("Lifecycle-client capabilities:");
  console.log(
    `  ✅ status → ${
      typeof client.status === "function" ? "available" : "unavailable"
    }`,
  );
  console.log(
    `  ✅ start  → ${
      typeof client.start === "function" ? "available" : "unavailable"
    }`,
  );
  console.log(
    `  ✅ stop   → ${
      typeof client.stop === "function" ? "available" : "unavailable"
    }`,
  );
  console.log(
    `  ✅ create → ${
      typeof client.create === "function" ? "available" : "unavailable"
    }`,
  );

  if (parsed.verbose) {
    console.log("");
    console.log("You can now invoke these commands programmatically:");
    console.log("  await client.status(<containerId>);");
    console.log("  await client.start(<containerId>);");
    console.log("  await client.stop(<containerId>);");
    console.log("  await client.create(<newName>, <image>);");
  }
}

// If this module is run directly (not imported), invoke main with Deno.args
if (import.meta.main) {
  main(Deno.args);
}
