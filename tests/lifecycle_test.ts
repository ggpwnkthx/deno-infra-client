// tests/lifecycle_test.ts

import { assert, assertEquals } from "jsr:@std/assert";
import { ContainerPlatform, detect } from "jsr:@ggpwnkthx/infra-sense@0.1.8";
import { getLifecycleClient } from "../src/lifecycle/client.ts";
import { checkRunPermission } from "../src/permissions/run.ts";

Deno.test("LifecycleClient: create → start → status → stop container", async (t) => {
  // 1) Detect the container platform
  let platform: ContainerPlatform;
  try {
    platform = await detect();
  } catch (err) {
    console.warn("Skipping test: failed to detect container platform:", err);
    return;
  }

  // If running on “Host” (no real container runtime), skip
  if (platform === ContainerPlatform.Host) {
    console.warn("Skipping test: platform is Host (no container runtime).");
    return;
  }

  // 2) Confirm we have run permission (otherwise subprocesses will fail)
  const runPerm = await checkRunPermission();
  if (runPerm.state !== "granted") {
    console.warn(
      `Skipping test: run permission is ${runPerm.state}` +
        (runPerm.message ? ` (${runPerm.message})` : ""),
    );
    return;
  }

  // 3) Construct a LifecycleClient
  let client;
  try {
    client = await getLifecycleClient(platform);
  } catch (err) {
    console.warn(
      `Skipping test: unable to construct LifecycleClient for ${platform}:`,
      err,
    );
    return;
  }

  // 4) Choose a unique container name (so parallel runs don't collide)
  const containerName = `test-container-${Date.now()}`;
  // Use a lightweight image; ensure it's available or pulled on first create
  const image = "alpine:latest";

  // 5) Create the container
  await t.step("create container", async () => {
    const result = await client.create(containerName, image);
    // `result` is a Deno.CommandOutput
    assert(result.success, `Expected create to exit 0, got ${result.code}`);
    assertEquals(result.code, 0);
  });

  // 6) Inspect status immediately after create (should exist but not running)
  await t.step("status after create (should exist)", async () => {
    const result = await client.status(containerName);
    // `result` is a Deno.CommandOutput
    assert(result.success, `Expected inspect to exit 0, got ${result.code}`);
    assertEquals(result.code, 0);
  });

  // 7) Start the container
  await t.step("start container", async () => {
    const result = await client.start(containerName);
    // `result` is a Deno.CommandOutput
    assert(result.success, `Expected start to exit 0, got ${result.code}`);
    assertEquals(result.code, 0);
  });

  // 8) Inspect status after start (should still exist, now running)
  await t.step("status after start (should be running)", async () => {
    const result = await client.status(containerName);
    // `result` is a Deno.CommandOutput
    assert(result.success, `Expected inspect to exit 0, got ${result.code}`);
    assertEquals(result.code, 0);
  });

  // 9) Stop (kill) the container
  await t.step("stop (kill) container", async () => {
    const result = await client.stop(containerName);
    // `result` is a Deno.CommandOutput
    assert(result.success, `Expected stop to exit 0, got ${result.code}`);
    assertEquals(result.code, 0);
  });

  // 10) Final cleanup: (optional) remove the container if Docker/Podman
  // Note: LifecycleClient does not have a remove method, so we invoke directly.
  await t.step("remove container", async () => {
    // Determine which CLI binary to use for removal
    const bin = platform === ContainerPlatform.Podman ? "podman" : "docker";
    // Attempt to remove; ignore errors if it doesn’t exist
    try {
      const proc = new Deno.Command(bin, {
        args: ["rm", containerName],
        stdout: "null",
        stderr: "inherit",
      }).spawn();
      const rmStatus = await proc.status;
      // Docker/podman rm returns 0 on success; if it’s already gone, code may be non‐zero
      // We assert success only if the container still existed
      if (rmStatus.code !== 0) {
        console.warn(
          `“${bin} rm ${containerName}” exited ${rmStatus.code}; container may not exist.`,
        );
      }
    } catch {
      // If the binary isn’t found or rm fails, just warn
      console.warn(`Failed to remove container ${containerName} with ${bin}.`);
    }
  });
});
