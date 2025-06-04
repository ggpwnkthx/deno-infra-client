// src/permissions/utils.ts

/**
 * Resolve the user’s home directory in a cross‐platform manner.
 * Prefers $HOME (Unix/macOS) and falls back to %USERPROFILE% (Windows).
 * Returns undefined if neither is set.
 */
export function getHomeDirectory(): string | undefined {
  return Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
}

/**
 * Construct the default kubeconfig path:
 *   • If KUBECONFIG is set, use that.
 *   • Otherwise, expand "~/.kube/config" using getHomeDirectory().
 */
export function getKubeConfigPath(): string {
  const envKube = Deno.env.get("KUBECONFIG");
  if (envKube) {
    return envKube;
  }
  const home = getHomeDirectory();
  if (home) {
    return `${home}/.kube/config`;
  }
  // Fallback if HOME/USERPROFILE isn’t defined
  return "/home/unknown/.kube/config";
}
