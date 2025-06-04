// src/permissions/types.ts

/**
 * A richer representation of permission checks for the CLI to consume.
 */
export interface PermissionEntry {
  name: string;
  state: "granted" | "denied" | "unavailable" | "error";
  /** Path associated with this check (only for read perms) */
  path?: string;
  /** If an error occurred during the check, this holds a brief message */
  message?: string;
}

export interface PermissionReport {
  platform: string;
  runPermission: PermissionEntry;
  readPermissions: PermissionEntry[];
  statusCommand: PermissionEntry;
  startCommand: PermissionEntry;
  stopCommand: PermissionEntry;
  /** True if ALL required permissions and capabilities are granted/available */
  ok: boolean;
}
