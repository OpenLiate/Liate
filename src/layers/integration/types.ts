export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface AgentMessage {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, any> }>;
  reasoningContent?: string;
  timestamp?: number;
}

export interface SessionData {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  messages: AgentMessage[];
  state: Record<string, any>;
}

export interface MemoryProvider {
  readonly sessionId: string;
  load(): Promise<SessionData>;
  save(): Promise<void>;
  getMessages(): AgentMessage[];
  append(message: AgentMessage | AgentMessage[]): Promise<void>;
  getState(key: string): any;
  setState(key: string, value: any): Promise<void>;
  clear(): Promise<void>;
}

export interface KnowledgeDoc {
  id: string;
  source: string;
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeContext {
  sources: string[];
  documents: KnowledgeDoc[];
  totalChars: number;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  execute: (args: Record<string, any>, context?: any) => Promise<string | Record<string, any>>;
}

export interface IntegrationConfig {
  memory?: string;
  knowledge?: string | string[] | Record<string, any>;
  state?: Record<string, any>;
  [key: string]: any;
}

