import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export interface McpAgentLike {
  name: string;
  run(prompt: string): Promise<{ text: string }>;
  [key: string]: any;
}

/**
 * Liate MCP Server Exposer [Layer T]
 * Exposes a Liate Agent as a standard Model Context Protocol (MCP) server.
 */
export function createAgentMcpServer(agent: McpAgentLike): McpServer {
  const agentName = agent.name || "Agent";
  const agentVersion = (agent as any).version || "0.0.1";
  const server = new McpServer({
    name: `liate-${agentName.toLowerCase()}`,
    version: agentVersion
  });

  // Tool 1: Run Agent
  (server as any).registerTool(
    `${agentName.toLowerCase()}_run`,
    {
      description: `Execute cognitive reasoning using the ${agentName} agent.`,
      inputSchema: {
        prompt: z.string().describe("The prompt or instruction to execute")
      }
    },
    async ({ prompt }: { prompt: string }) => {
      const result = await agent.run(prompt);
      return {
        content: [{ type: "text", text: result.text }]
      };
    }
  );

  // Tool 2: Agent Health & Status
  (server as any).registerTool(
    `${agentName.toLowerCase()}_health`,
    {
      description: `Check the status of the ${agentName} agent.`,
      inputSchema: {}
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "ok",
                agent: agentName,
                protocol: "Liate API v1",
                doctrine: "Where a Class is an Agent. Built for Sovereign AI Agents From India to the World."
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  return server;
}

