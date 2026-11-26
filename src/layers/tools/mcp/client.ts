import type { Client } from "@modelcontextprotocol/client";
import type { AgentTool } from "@/layers/agent/types";
import type { McpServerConfig } from "@/layers/tools/types";
import { discoverStdioMcpTools } from "@/layers/tools/mcp/stdio";
import { discoverHttpMcpTools } from "@/layers/tools/mcp/http";

/**
 * Layer [T] MCP Orchestrator
 * Routes discovery to Stdio or HTTP/SSE transports and manages client cleanup.
 */
export class MCP {
  private static activeClients: Client[] = [];
  private static activeTransports: any[] = [];

  public static async closeAll(): Promise<void> {
    for (const client of this.activeClients) {
      try {
        await client.close();
      } catch {}
    }
    this.activeClients = [];

    for (const transport of this.activeTransports) {
      try {
        if (typeof transport.close === "function") {
          await transport.close();
        }
        const proc = (transport as any)._process || (transport as any).process;
        if (proc && typeof proc.kill === "function" && !proc.killed) {
          try {
            proc.kill();
          } catch {}
        }
      } catch {}
    }
    this.activeTransports = [];
  }

  public static async discoverTools(
    config: McpServerConfig,
    toolFilter?: string[]
  ): Promise<AgentTool[]> {
    if (
      config.transport === "http" ||
      config.transport === "sse" ||
      (config.url && (config.url.startsWith("http://") || config.url.startsWith("https://")))
    ) {
      return this.discoverHttpTools(config, toolFilter);
    }
    return this.discoverStdioTools(config, toolFilter);
  }

  public static async discoverStdioTools(
    config: McpServerConfig,
    toolFilter?: string[]
  ): Promise<AgentTool[]> {
    return discoverStdioMcpTools(config, toolFilter, (client, transport) => {
      this.activeClients.push(client);
      this.activeTransports.push(transport);
    });
  }

  public static async discoverHttpTools(
    config: McpServerConfig,
    toolFilter?: string[]
  ): Promise<AgentTool[]> {
    return discoverHttpMcpTools(config, toolFilter);
  }
}
