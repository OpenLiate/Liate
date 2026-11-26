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
  agentVersion?: string;
  durationMs: number;
  finishReason: "stop" | "max_steps_reached" | "error";
  audioBase64?: string;
}

export interface AgentExecutionOptions {
  model?: string;
  /** Tag to select from a MultiModelMap Layer [L], e.g. "fast", "reason", "voice" */
  modelTag?: string;
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
  /** Directly run a named sub-agent declared in Layer [A].subAgents */
  subAgent?: string;
  /** Per-run context merged with Layer [I].context */
  context?: string | Record<string, any>;
}

export interface SubAgentSpec {
  name: string;
  intent?: string;
  modelTag?: string;
  maxSteps?: number;
  skills?: string[];
}

export interface AgentConfig {
  name: string;
  version?: string;
  intent?: string;
  model?: string;
  maxSteps?: number;
  tools?: AgentTool[];
  skills?: string[];
  subAgents?: SubAgentSpec[];
  context?: string | Record<string, any>;
}

export interface AgentVersionSnapshot {
  agentName: string;
  version: string;
  hash: string;
  parentHash?: string;
  message?: string;
  timestamp: string;
  spec: {
    L: any;
    I?: Record<string, any>;
    A: Record<string, any>;
    T?: any;
  };
}

export interface AgentVersionChange {
  layer: "L" | "I" | "A" | "T";
  field: string;
  before: any;
  after: any;
}

export interface AgentVersionDiff {
  fromVersion: string;
  toVersion: string;
  fromHash: string;
  toHash: string;
  changed: boolean;
  changes: AgentVersionChange[];
}
