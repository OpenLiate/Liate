import fs from "fs";
import path from "path";
import os from "os";
import type { SandboxConfig } from "@/layers/environment/types";

export class EnvironmentResolver {
  /**
   * Automatically loads .env and .env.local files from cwd, module dir, parent dirs, and home dir
   */
  public static loadEnv(targetPath?: string): void {
    // 1. Load keys from ~/.liate/config.json if available
    try {
      const configPath = path.resolve(os.homedir(), ".liate", "config.json");
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.keys && typeof parsed.keys === "object") {
          for (const [k, v] of Object.entries(parsed.keys)) {
            if (!process.env[k]) {
              process.env[k] = String(v);
            }
          }
        }
      }
    } catch {}

    // 2. Load .env files from candidate locations
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), ".liate", ".env"),
      path.resolve(process.cwd(), "..", ".env"),
      path.resolve(process.cwd(), "..", ".env.local"),
      targetPath ? path.resolve(path.dirname(targetPath), ".env") : "",
      targetPath ? path.resolve(path.dirname(targetPath), ".env.local") : "",
      path.resolve(os.homedir(), ".liate", ".env"),
      path.resolve(os.homedir(), ".liate", "config.env"),
      path.resolve(os.homedir(), ".env")
    ].filter(Boolean);

    for (const file of candidates) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const [k, ...v] = trimmed.split("=");
            if (k && !process.env[k.trim()]) {
              process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
            }
          }
        } catch {}
      }
    }
  }

  /**
   * Expands variable references (e.g. "$API_KEY" -> process.env.API_KEY)
   */
  public static resolve(
    declaredEnv: Record<string, string | undefined>,
    systemEnv: Record<string, string | undefined> = process.env
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, val] of Object.entries(declaredEnv)) {
      if (typeof val === "string" && val.startsWith("$")) {
        const varName = val.slice(1);
        resolved[key] = systemEnv[varName] || "";
      } else {
        resolved[key] = String(val ?? "");
      }
    }

    return resolved;
  }

  /**
   * Masks sensitive credentials in logs (e.g. sk_live_1234... -> sk_l***5678)
   */
  public static maskSecret(value: string): string {
    if (!value || value.length <= 8) {
      return "******";
    }
    const prefix = value.slice(0, 4);
    const suffix = value.slice(-4);
    return `${prefix}***${suffix}`;
  }

  /**
   * Constructs an isolated sandbox configuration
   */
  public static createSandbox(
    env: Record<string, string | undefined>,
    options: Partial<SandboxConfig> = {}
  ): SandboxConfig {
    const resolvedEnv = this.resolve(env);

    return {
      allowedDomains: options.allowedDomains || [],
      denyNetwork: options.denyNetwork ?? false,
      timeoutMs: options.timeoutMs ?? 30000,
      env: resolvedEnv
    };
  }

  /**
   * Enforces network & domain allowlist boundaries defined in SandboxConfig.
   */
  public static assertNetworkAllowed(targetUrl: string, sandbox: SandboxConfig): void {
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
  public static async runWithTimeout<T>(
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
}
