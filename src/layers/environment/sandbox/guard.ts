import type { SandboxConfig } from "@/layers/environment/types";

/**
 * Enforces network & domain allowlist boundaries defined in SandboxConfig.
 */
export function assertSandboxNetworkAllowed(targetUrl: string, sandbox: SandboxConfig): void {
  if (sandbox.denyNetwork) {
    throw new Error(`Layer [E] Sandbox Violation: Network access is disabled (blocked ${targetUrl}).`);
  }
  if (sandbox.allowedDomains && sandbox.allowedDomains.length > 0) {
    let hostname: string;
    try {
      hostname = new URL(targetUrl).hostname.toLowerCase();
    } catch {
      throw new Error(`Layer [E] Sandbox Violation: Invalid URL '${targetUrl}'.`);
    }
    const allowed = sandbox.allowedDomains.some((d) => {
      const clean = d.toLowerCase().trim();
      return hostname === clean || hostname.endsWith(`.${clean}`);
    });
    if (!allowed) {
      throw new Error(
        `Layer [E] Sandbox Violation: Domain '${hostname}' is not in allowedDomains [${sandbox.allowedDomains.join(", ")}].`
      );
    }
  }
}

/**
 * Executes an async operation with an active timeout guardrail.
 */
export async function runWithSandboxTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  label: string = "Sandbox operation"
): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return fn();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Layer [E] Sandbox Timeout: ${label} exceeded ${timeoutMs}ms.`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
