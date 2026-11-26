import fs from "fs";
import path from "path";
import os from "os";

/**
 * Automatically loads .env and .env.local files from cwd, target dir, parent dirs, and ~/.liate.
 */
export function loadEnvFiles(targetPath?: string): void {
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
 * Expands $VAR references (e.g. "$API_KEY" -> process.env.API_KEY).
 */
export function resolveEnvVars(
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
 * Masks sensitive credentials in logs (e.g. sk_live_1234... -> sk_l***5678).
 */
export function maskSecretValue(value: string): string {
  if (!value || value.length <= 8) {
    return "******";
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}
