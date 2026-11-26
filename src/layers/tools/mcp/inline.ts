import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AgentTool } from "@/layers/agent/types";
import type { InlineMcpSpec } from "@/layers/tools/types";

/**
 * Registers an inline in-process MCP v2 server (@modelcontextprotocol/server)
 * and returns its tools as native AgentTools with zero subprocess overhead.
 */
export function createInlineMcpTools(spec: InlineMcpSpec): {
  server: McpServer;
  tools: AgentTool[];
} {
  const server = new McpServer({
    name: spec.name || "liate-inline-mcp",
    version: spec.version || "0.0.1"
  });

  const tools: AgentTool[] = [];

  for (const t of spec.tools) {
    const zodShape: Record<string, any> = {};
    const props = t.parameters?.properties || {};
    for (const [k, schema] of Object.entries<any>(props)) {
      let zField: any = schema?.type === "number" ? z.number() : schema?.type === "boolean" ? z.boolean() : z.string();
      if (schema?.description) zField = zField.describe(schema.description);
      const isRequired = Array.isArray(t.parameters?.required) && t.parameters.required.includes(k);
      zodShape[k] = isRequired ? zField : zField.optional();
    }

    (server as any).registerTool(
      t.name,
      {
        description: t.description,
        inputSchema: zodShape
      },
      async (args: Record<string, any>) => {
        const out = await t.execute(args);
        const text = typeof out === "string" ? out : JSON.stringify(out);
        return {
          content: [{ type: "text", text }]
        };
      }
    );

    tools.push({
      name: t.name,
      description: t.description,
      parameters: t.parameters || { type: "object", properties: {} },
      execute: async (args) => {
        const out = await t.execute(args);
        return typeof out === "string" ? out : JSON.stringify(out);
      }
    });
  }

  return { server, tools };
}
