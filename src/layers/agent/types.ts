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

export interface AgentRunResult<TData = any> {
  text: string;
  data?: TData;
  thought?: string;
  steps: AgentStep[];
  totalSteps: number;
  model: string;
  agentVersion?: string;
  durationMs: number;
  finishReason: "stop" | "max_steps_reached" | "error" | "paused_for_approval";
  audioBase64?: string;
  checkpointId?: string;
  pendingApproval?: {
    checkpointId: string;
    step: number;
    toolCalls: ToolCall[];
  };
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
  /** Require human approval before executing all tools (true) or listed tool names */
  requireApproval?: boolean | string[];
  /** Custom checkpoint store instance for HITL pause/resume */
  checkpointStore?: any;
  /** Optional Zod or JSON Schema enforced on the final output */
  outputSchema?: any;
  /** Enable durable step checkpointing for this run */
  durable?: boolean;
  /** Explicit durable run ID for resuming or idempotent replay */
  runId?: string;
  /** Skip declarative Layer [A].workflow and execute a direct ReAct loop */
  bypassWorkflow?: boolean;
}

export interface SubAgentSpec {
  name: string;
  intent?: string;
  modelTag?: string;
  maxSteps?: number;
  skills?: string[];
  /** Remote A2A v1.0 peer URL (e.g. https://agent.example.com) */
  a2aUrl?: string;
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
  requireApproval?: boolean | string[];
  outputSchema?: any;
  durable?: boolean | string;
  workflow?: any[];
  schedule?: any;
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
