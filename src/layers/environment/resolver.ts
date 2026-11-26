import type { SandboxConfig } from "@/layers/environment/types";
import { loadEnvFiles, resolveEnvVars, maskSecretValue } from "@/layers/environment/env/loader";
import { assertSandboxNetworkAllowed, runWithSandboxTimeout } from "@/layers/environment/sandbox/guard";

/**
 * Layer [E] Environment & Sandbox Resolver
 */
export class EnvironmentResolver {
  public static loadEnv(targetPath?: string): void {
    loadEnvFiles(targetPath);
  }

  public static resolve(
    declaredEnv: Record<string, string | undefined>,
    systemEnv: Record<string, string | undefined> = process.env
  ): Record<string, string> {
    return resolveEnvVars(declaredEnv, systemEnv);
  }

  public static maskSecret(value: string): string {
    return maskSecretValue(value);
  }

  public static createSandbox(
    env: Record<string, string | undefined>,
    options: Partial<SandboxConfig> = {}
  ): SandboxConfig {
    return {
      allowedDomains: options.allowedDomains || [],
      denyNetwork: options.denyNetwork ?? false,
      timeoutMs: options.timeoutMs ?? 30000,
      env: this.resolve(env)
    };
  }

  public static assertNetworkAllowed(targetUrl: string, sandbox: SandboxConfig): void {
    assertSandboxNetworkAllowed(targetUrl, sandbox);
  }

  public static async runWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number = 30000,
    label: string = "Sandbox operation"
  ): Promise<T> {
    return runWithSandboxTimeout(fn, timeoutMs, label);
  }
}
