// src/lifecycle/utils.ts

/**
 * Attempt to see if `bin` is actually present & executable.
 * We do a minimal `bin --help` invocation:
 *  - If it throws Deno.errors.NotFound, we know the binary isn’t installed.
 *  - Otherwise (even if it fails with PermissionDenied or prints usage),
 *    we treat the binary as “present.”
 */
export async function isExecutable(bin: string): Promise<boolean> {
  try {
    const proc = new Deno.Command(bin, {
      args: ["--help"],
      stdout: "null",
      stderr: "null",
    }).spawn();
    await proc.status;
    return true;
  } catch (err: unknown) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    return true;
  }
}

/**
 * Helper: shell‐out to a subprocess and return its full output.
 */
export async function runSubprocess(
  program: string,
  args: string[],
): Promise<Deno.CommandOutput> {
  return await new Deno.Command(program, {
    args,
    stdout: "piped",
    stderr: "piped",
  }).output();
}
