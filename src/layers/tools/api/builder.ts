import type { AgentTool } from "@/layers/agent/types";
import type { ApiToolSpec } from "@/layers/tools/types";

function interpolateEnv(value: string, env: Record<string, string | undefined>): string {
  return value.replace(/\$([A-Z0-9_]+)/g, (_, name) => env[name] || process.env[name] || "");
}

/**
 * Creates a direct REST/HTTP API-based AgentTool without requiring an MCP server.
 * Supports {param} path placeholders, JSON body, and $ENV_VAR header resolution.
 */
export function createApiTool(
  spec: ApiToolSpec,
  customEnv: Record<string, string | undefined> = process.env
): AgentTool {
  const method = (spec.method || "GET").toUpperCase();
  const placeholders = Array.from(spec.url.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((m) => m[1]);

  const properties: Record<string, any> = {};
  for (const key of placeholders) {
    properties[key] = { type: "string", description: `URL parameter '${key}'` };
  }
  if (method !== "GET" && method !== "DELETE") {
    properties.body = { type: "object", description: "Optional JSON request body" };
  }
  if (spec.parameters) {
    Object.assign(properties, spec.parameters);
  }

  return {
    name: spec.name,
    description: spec.description || `Call ${method} ${spec.url}`,
    parameters: {
      type: "object",
      properties,
      ...(placeholders.length > 0 ? { required: placeholders } : {})
    },
    execute: async (args) => {
      let resolvedUrl = interpolateEnv(spec.url, customEnv);
      for (const key of placeholders) {
        resolvedUrl = resolvedUrl.replace(`{${key}}`, encodeURIComponent(String(args[key] ?? "")));
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (spec.headers) {
        for (const [k, v] of Object.entries(spec.headers)) {
          headers[k] = interpolateEnv(String(v), customEnv);
        }
      }

      const res = await fetch(resolvedUrl, {
        method,
        headers,
        body: args.body && method !== "GET" && method !== "DELETE"
          ? JSON.stringify(args.body)
          : undefined
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(`API tool '${spec.name}' failed (${res.status}): ${text}`);
      }
      return text;
    }
  };
}
