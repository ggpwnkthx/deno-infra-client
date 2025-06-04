// src/permissions/command.ts

import type { PermissionEntry } from "./types.ts";

/**
 * Helper to attempt running a given command (e.g. "docker", "podman", "crio")
 * with specific args, returning whether we can invoke it successfully.
 *
 * States:
 *  - "granted"      → command exists and ran (exit code 0 or non‐zero, but not permission‐denied)
 *  - "denied"       → command exists but permission was denied
 *  - "unavailable"  → command binary not found (ENOENT)
 *  - "error"        → any other error (captured in message)
 */
export async function checkCommandCapability(
  bin: string,
  args: string[],
): Promise<PermissionEntry> {
  // First, ensure we have run permission at all:
  try {
    const runPerm = await Deno.permissions.query({ name: "run" });
    if (runPerm.state !== "granted") {
      return {
        name: `${bin} ${args.join(" ")}`,
        state: "denied",
        message: "run permission not granted",
      };
    }
  } catch (err) {
    return {
      name: `${bin} ${args.join(" ")}`,
      state: "error",
      message: `failed to query run permission: ${err}`,
    };
  }

  // Attempt to spawn the process
  let proc: Deno.ChildProcess | undefined;
  try {
    proc = new Deno.Command(Deno.execPath(), {
      args: [bin, ...args],
      stdout: "null",
      stderr: "null",
    }).spawn();
  } catch (err: unknown) {
    if (err instanceof Deno.errors.NotFound) {
      // Binary not in PATH
      return {
        name: `${bin} ${args.join(" ")}`,
        state: "unavailable",
      };
    } else if (err instanceof Deno.errors.PermissionDenied) {
      return {
        name: `${bin} ${args.join(" ")}`,
        state: "denied",
        message: "permission denied to run subprocess",
      };
    } else {
      return {
        name: `${bin} ${args.join(" ")}`,
        state: "error",
        message: String(err),
      };
    }
  }

  // If we got here, the process was spawned. Wait for it and inspect exit.
  try {
    const status = await proc.status;
    // We consider “granted” even if exit code ≠ 0 (meaning the command ran),
    // because it proves we can invoke the binary.
    return {
      name: `${bin} ${args.join(" ")}`,
      state: status.success ? "granted" : "error",
    };
  } catch (err) {
    proc.kill();
    // If waiting failed, report error
    return {
      name: `${bin} ${args.join(" ")}`,
      state: "error",
      message: String(err),
    };
  }
}
