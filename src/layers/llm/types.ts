export type LlmRole = "system" | "user" | "assistant" | "tool";

export interface LlmMessage {
  role: LlmRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export type SarvamMessage = LlmMessage;

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LlmChatOptions {
  model: string;
  provider?: string;
  baseUrl?: string;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: "none" | "low" | "high" | "max";
  apiKey?: string;
  tools?: any[];
  toolChoice?: string | object;
  systemPrompt?: string;
  stream?: boolean;
  onToken?: (chunk: string) => void;
  onReasoningToken?: (chunk: string) => void;
}

export type SarvamChatOptions = LlmChatOptions;

export interface LlmChatResponse {
  text: string;
  reasoningContent?: string;
  toolCalls?: ToolCall[];
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  audioBase64?: string;
}

export type SarvamChatResponse = LlmChatResponse;

export interface LlmTtsOptions {
  text: string;
  model?: string;
  voice?: string;
  language?: string;
  apiKey?: string;
}

export interface LlmTtsResponse {
  audioBuffer: Buffer;
  contentType: string;
  model: string;
  voice: string;
  byteLength: number;
}

export interface LLMExecutionResult {
  text: string;
  reasoningContent?: string;
  provider: string;
  model: string;
  durationMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    tokensSaved?: number;
  };
}

export interface HubLLMDefinition {
  name: string;
  provider: string;
  version: string;
  base_url: string;
  endpoint: string;
  tts_endpoint?: string;
  stt_endpoint?: string;
  models_endpoint?: string;
  systemone_endpoint?: string;
  headers: Record<string, string>;
  features: {
    tool_calling: boolean;
    streaming: boolean;
    reasoning: boolean;
    system_one_decisions?: boolean;
  };
}

export interface DiscoveredModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  provider: string;
  description?: string;
}

export interface NormalizedModel {
  provider: string;
  model: string;
  baseUrl?: string;
  endpoint?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Declarative Provider Definition for Layer [L].
 * Contributors add new OpenAI-compatible providers by creating a single file
 * implementing this interface under src/layers/llm/providers/.
 */
export interface ProviderDefinition {
  /** Unique lowercase provider slug (e.g. "sarvam", "groq", "ollama") */
  id: string;
  /** Human-readable provider name */
  name: string;
  /** API version tag */
  version: string;
  /** Resolves the base URL (can read env overrides dynamically) */
  baseUrl: () => string;
  /** Optional explicit chat endpoint override (defaults to `${baseUrl()}/chat/completions`) */
  endpoint?: () => string;
  /** Optional models discovery endpoint (defaults to `${baseUrl()}/models`) */
  modelsEndpoint?: () => string;
  /** Optional TTS endpoint */
  ttsEndpoint?: () => string;
  /** Optional STT endpoint */
  sttEndpoint?: () => string;
  /** Optional System-One decision endpoint */
  systemOneEndpoint?: () => string;
  /** Ordered environment variable names checked for this provider's API key */
  envKeys: string[];
  /** Builds static/placeholder headers for HubLLMDefinition inspection */
  defaultHeaders?: () => Record<string, string>;
  /** Builds live HTTP request headers given an optional resolved API key */
  authHeaders?: (apiKey?: string) => Record<string, string>;
  /** Optional model name prefixes used to auto-detect this provider when no prefix is given */
  modelPrefixes?: string[];
  /** Supported gateway capabilities */
  features: {
    tool_calling: boolean;
    streaming: boolean;
    reasoning: boolean;
    system_one_decisions?: boolean;
  };
}
