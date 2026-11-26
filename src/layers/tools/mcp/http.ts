import type { AgentTool } from "@/layers/agent/types";
import type { McpServerConfig } from "@/layers/tools/types";

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number = 15000,
  retries: number = 2
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function parseMcpPayload(rawText: string): any {
  const trimmed = rawText.trim();
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const l = line.trim();
      if (l.startsWith("data:")) {
        try {
          return JSON.parse(l.slice(5).trim());
        } catch {}
      }
    }
  }
  return JSON.parse(trimmed);
}

/**
 * Discovers tools from a remote MCP HTTP/SSE endpoint via JSON-RPC 2.0.
 */
export async function discoverHttpMcpTools(
  config: McpServerConfig,
  toolFilter?: string[]
): Promise<AgentTool[]> {
  const url = config.url!;
  const filterSet = toolFilter && toolFilter.length > 0
    ? new Set(toolFilter.map((t) => t.toLowerCase()))
    : null;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream, */*",
    ...(config.headers || {})
  };

  try {
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
      })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`[MCP] Remote HTTP server '${config.name}' returned status ${res.status}: ${errBody || res.statusText}`);
      return [];
    }

    const resText = await res.text();
    const data: any = parseMcpPayload(resText);
    const rawTools = data.result?.tools || [];
    const registeredTools: AgentTool[] = [];

    for (const t of rawTools) {
      if (filterSet && !filterSet.has(t.name.toLowerCase())) continue;

      registeredTools.push({
        name: t.name,
        description: t.description || `HTTP MCP tool ${t.name}`,
        parameters: t.inputSchema || { type: "object", properties: {} },
        execute: async (args: Record<string, any>) => {
          try {
            const callRes = await fetchWithRetry(url, {
              method: "POST",
              headers,
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "tools/call",
                params: { name: t.name, arguments: args }
              })
            });

            const callText = await callRes.text();
            const callData: any = parseMcpPayload(callText);
            const content = callData.result?.content;
            if (Array.isArray(content)) {
              return content.map((c: any) => c.text ?? JSON.stringify(c)).join("\n");
            }
            return typeof callData.result === "string"
              ? callData.result
              : JSON.stringify(callData.result || callData);
          } catch (err: any) {
            return `Error calling HTTP MCP tool ${t.name}: ${err.message}`;
          }
        }
      });
    }

    return registeredTools;
  } catch (err: any) {
    console.warn(`[MCP] HTTP discovery failed for ${config.name}: ${err.message}`);
    return [];
  }
}
