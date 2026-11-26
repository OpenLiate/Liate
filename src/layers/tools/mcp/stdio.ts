import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import type { AgentTool } from "@/layers/agent/types";
import type { McpServerConfig } from "@/layers/tools/types";

/**
 * Discovers and wraps tools from a local MCP server over Stdio (uvx, bunx, npx, or binary).
 */
export async function discoverStdioMcpTools(
  config: McpServerConfig,
  toolFilter: string[] | undefined,
  onRegister: (client: Client, transport: any) => void
): Promise<AgentTool[]> {
  const filterSet = toolFilter && toolFilter.length > 0
    ? new Set(toolFilter.map((t) => t.toLowerCase()))
    : null;

  try {
    const isWin = process.platform === "win32";
    const containerSafeEnv: Record<string, string> = {
      ...(isWin ? {} : { HOME: process.env.HOME || "/tmp" }),
      npm_config_cache: isWin ? (process.env.TEMP || "/tmp") : "/tmp/.npm",
      npm_config_update_notifier: "false",
      ...process.env,
      ...(config.env || {})
    };

    let resolvedCommand = config.command || "npx";
    if (isWin && (resolvedCommand === "npx" || resolvedCommand === "npm" || resolvedCommand === "pnpm")) {
      resolvedCommand = `${resolvedCommand}.cmd`;
    }

    const transport = new StdioClientTransport({
      command: resolvedCommand,
      args: config.args || [],
      env: containerSafeEnv
    });

    const safeJsonSchemaValidator = {
      getValidator: () => (input: any) => ({ valid: true, data: input })
    };

    const client = new Client(
      {
        name: `liate-${config.name}`,
        version: config.version || "0.0.1"
      },
      {
        capabilities: {},
        jsonSchemaValidator: safeJsonSchemaValidator as any,
        timeout: 60000
      } as any
    );

    await client.connect(transport);
    onRegister(client, transport);

    const toolsResult = await client.listTools(undefined, { timeout: 60000 });
    const registeredTools: AgentTool[] = [];

    for (const t of toolsResult.tools) {
      if (filterSet && !filterSet.has(t.name.toLowerCase())) continue;

      registeredTools.push({
        name: t.name,
        description: t.description || `Tool from ${config.name} MCP server`,
        parameters: (t.inputSchema as Record<string, any>) || { type: "object", properties: {} },
        execute: async (callArgs: Record<string, any>) => {
          try {
            const res = await client.callTool({
              name: t.name,
              arguments: callArgs
            });

            if (res && res.content && Array.isArray(res.content)) {
              return res.content.map((c: any) => c.text ?? JSON.stringify(c)).join("\n");
            }
            return typeof res === "string" ? res : JSON.stringify(res);
          } catch (err: any) {
            return `Error calling MCP tool ${t.name}: ${err.message}`;
          }
        }
      });
    }

    return registeredTools;
  } catch (err: any) {
    console.warn(`[MCP] Stdio discovery failed for ${config.name}: ${err.message}`);
    return [];
  }
}
