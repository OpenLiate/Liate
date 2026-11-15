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


