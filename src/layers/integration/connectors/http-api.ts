import type { AgentTool, HttpApiIntegrationSpec, IntegrationConnectorDefinition } from "@/layers/integration/types";

function resolveSecret(envVar?: string, env?: Record<string, string | undefined>): string | undefined {
  if (!envVar) return undefined;
  const keyName = envVar.startsWith("$") ? envVar.slice(1) : envVar;
  return env?.[keyName] ?? (typeof process !== "undefined" ? process.env?.[keyName] : undefined);
}

export const httpApiConnector: IntegrationConnectorDefinition<HttpApiIntegrationSpec> = {
  id: "http-api",
  name: "Direct HTTP / REST API Connector",
  buildTool: (alias, spec, env): AgentTool => {
    const safeName = `api_${alias.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    const cleanBase = spec.baseUrl.replace(/\/+$/, "");

    return {
      name: safeName,
      description: spec.description || `Call integrated REST API '${alias}' (${cleanBase}).`,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative endpoint path (e.g. '/users/1')" },
          method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "HTTP method (default: GET)" },
          body: { type: "object", description: "Optional JSON request body for POST/PUT/PATCH" }
        },
        required: ["path"]
      },
      execute: async (args) => {
        const relPath = String(args.path || "/");
        const normalizedPath = relPath.startsWith("/") ? relPath : `/${relPath}`;
        const url = `${cleanBase}${normalizedPath}`;
        const method = String(args.method || "GET").toUpperCase();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(spec.headers || {})
        };

        const token = resolveSecret(spec.authEnvVar, env);
        if (token) {
          const headerName = spec.authHeaderName || "Authorization";
          const scheme = spec.authScheme || "Bearer";
          headers[headerName] = scheme === "Header" ? token : `${scheme} ${token}`;
        }

        const res = await fetch(url, {
          method,
          headers,
          body: args.body && method !== "GET" ? JSON.stringify(args.body) : undefined
        });

        const text = await res.text();
        if (!res.ok) {
          throw new Error(`API '${alias}' error (${res.status}): ${text}`);
        }
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }
    };
  }
};
