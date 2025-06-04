// src/permissions/run.ts

import type { PermissionEntry } from "./types.ts";

/**
 * Query the 'run' permission. Returns a PermissionEntry.
 */
export async function checkRunPermission(): Promise<PermissionEntry> {
  try {
    const runPerm = await Deno.permissions.query({ name: "run" });
    return {
      name: "run",
      state: runPerm.state === "granted" ? "granted" : "denied",
    };
  } catch (err) {
    return {
      name: "run",
      state: "error",
      message: String(err),
    };
  }
}
