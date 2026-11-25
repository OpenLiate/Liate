export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  execute: (args: Record<string, any>, context?: AgentContext) => Promise<string | Record<string, any>>;
}

export interface AgentContext {
  agentName: string;
  intent: string;
  sessionId?: string;
  state: Record<string, any>;
}

export interface AgentStep {
  step: number;
  thought?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  output?: string;
  timestamp: number;
}

export interface AgentRunResult {
  text: string;
  thought?: string;
  steps: AgentStep[];
  totalSteps: number;
  model: string;
  durationMs: number;
  finishReason: "stop" | "max_steps_reached" | "error";
  audioBase64?: string;
}

export interface AgentExecutionOptions {
  model?: string;
  maxTokens?: number;
  maxSteps?: number;
  systemPrompt?: string;
  temperature?: number;
  tools?: AgentTool[];
  skills?: string[];
  apiKey?: string;
  stream?: boolean;
  onToken?: (chunk: string) => void;
  onReasoningToken?: (chunk: string) => void;
  onStep?: (step: AgentStep) => void;
  sandboxTimeoutMs?: number;
}

export interface AgentConfig {
  name: string;
  intent?: string;
  model?: string;
  maxSteps?: number;
  tools?: AgentTool[];
  skills?: string[];
}

