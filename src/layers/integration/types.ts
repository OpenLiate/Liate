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

export interface RemoteSessionAdapter {
  load(sessionId: string): Promise<SessionData | null>;
  save(data: SessionData): Promise<void>;
  close?(): Promise<void> | void;
}

/**
 * Pluggable memory/session backend factory for Layer [I].
 * Contributors add new backends under src/layers/integration/memory/adapters/.
 */
export interface SessionAdapterDefinition {
  id: string;
  name: string;
  /** Returns true if this adapter handles the given memory target string (e.g. "neon://...") */
  matches: (target?: string) => boolean;
  create: (target?: string) => {
    sessionId: string;
    filePath?: string;
    adapter?: RemoteSessionAdapter;
    isInMemory?: boolean;
  };
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
  vectorConfig?: VectorKnowledgeConfig;
}

export interface VectorKnowledgeConfig {
  /** "pgvector" | "neon" | "supabase" | "postgresql://..." | "pinecone" */
  vector: string;
  /** Explicit embedding model slug (e.g. "sarvam/embeddinggemma-2", "ollama/nomic-embed-text") */
  embedModel: string;
  embedApiKey?: string;
  table?: string;
  topK?: number;
  /** Pinecone index host or $PINECONE_INDEX_HOST */
  indexHost?: string;
  namespace?: string;
  apiKey?: string;
}

/**
 * Pluggable knowledge source loader for Layer [I].
 * Contributors add new sources under src/layers/integration/knowledge/sources/.
 */
export interface KnowledgeSourceDefinition {
  id: string;
  name: string;
  matches: (item: string, baseDir: string) => boolean;
  load: (item: string, baseDir: string) => Promise<KnowledgeDoc[]>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  execute: (args: Record<string, any>, context?: any) => Promise<string | Record<string, any>>;
}

/**
 * Direct REST/HTTP API integration spec under Layer [I].apis
 */
export interface HttpApiIntegrationSpec {
  baseUrl: string;
  description?: string;
  headers?: Record<string, string>;
  authEnvVar?: string;
  authScheme?: "Bearer" | "Basic" | "Header";
  authHeaderName?: string;
}

/**
 * Outbound Webhook integration spec under Layer [I].webhooks
 */
export interface WebhookIntegrationSpec {
  url: string;
  description?: string;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  secretEnvVar?: string;
}

/**
 * Pluggable external integration connector for Layer [I].
 * Contributors add new connectors under src/layers/integration/connectors/.
 */
export interface IntegrationConnectorDefinition<TSpec = Record<string, any>> {
  id: string;
  name: string;
  buildTool: (alias: string, spec: TSpec, env?: Record<string, string | undefined>) => AgentTool;
}

export interface IntegrationConfig {
  memory?: string;
  knowledge?: string | string[] | Record<string, any>;
  context?: string | Record<string, any>;
  libs?: string[] | Record<string, string>;
  repo?: string;
  apis?: Record<string, HttpApiIntegrationSpec>;
  webhooks?: Record<string, WebhookIntegrationSpec>;
  state?: Record<string, any>;
  agentId?: string;
  email?: string;
  [key: string]: any;
}
