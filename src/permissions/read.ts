// src/permissions/read.ts

import type { PermissionEntry } from "./types.ts";

/**
 * Given an array of filesystem paths, query read permission on each.
 * Returns an array of PermissionEntry. If the platform is Windows,
 * we skip path-based checks because Windows container runtimes
 * don’t typically expose Unix sockets in the same way.
 */
export async function checkReadPermissions(
  paths: string[],
): Promise<PermissionEntry[]> {
  // On Windows, skip these path‐based checks
  if (Deno.build.os === "windows") {
    return [];
  }

  const results: PermissionEntry[] = [];
  for (const p of paths) {
    try {
      const entry = await Deno.permissions.query({ name: "read", path: p });
      results.push({
        name: "read",
        state: entry.state === "granted" ? "granted" : "denied",
        path: p,
      });
    } catch (err) {
      results.push({
        name: "read",
        state: "error",
        path: p,
        message: String(err),
      });
    }
  }
  return results;
}
