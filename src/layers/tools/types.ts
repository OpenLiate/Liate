import type { AgentContext } from "@/layers/agent/types";

export interface LlmToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface McpServerConfig {
  id: string;
  name: string;
  version?: string;
  description?: string;
  transport?: "stdio" | "sse" | "http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ToolExecutorResult {
  toolName: string;
  result: string;
  error?: string;
}

export interface ParsedToolSpec {
  raw: string;
  isMcp: boolean;
  isBuiltin?: boolean;
  serverName?: string;
  selectedTools?: string[];
}

export interface ApiToolSpec {
  type?: "api";
  name: string;
  description?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  parameters?: Record<string, any>;
}

export interface InlineMcpToolSpec {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<unknown> | unknown;
}

export interface InlineMcpSpec {
  type?: "mcp-inline";
  name: string;
  version?: string;
  tools: InlineMcpToolSpec[];
}

