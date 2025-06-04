// src/projectInfo.ts

import { parse as parseJsonc } from "jsr:@std/jsonc@1.0.2";

/**
 * ProjectInfo describes the shape of metadata extracted from deno.jsonc.
 */
export interface ProjectInfo {
  name: string;
  version: string;
}

/**
 * Reads "deno.jsonc" from the project root and extracts "name" and "version" fields.
 * If the file cannot be read or fields are missing, returns defaults.
 */
export async function getProjectInfo(): Promise<ProjectInfo> {
  try {
    const raw = await Deno.readTextFile("deno.jsonc");
    const data = parseJsonc(raw) as Record<string, unknown>;
    const nameField = typeof data.name === "string" ? data.name : "unknown";
    const versionField = typeof data.version === "string"
      ? data.version
      : "0.0.0";
    return { name: nameField, version: versionField };
  } catch {
    // File not found or parsing error: use defaults
    return { name: "unknown", version: "0.0.0" };
  }
}
