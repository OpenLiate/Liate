/**
 * Liate — Layer [L]: Sovereign Large Models Layer
 * Native Sarvam AI Token Factory & Indic Model Router
 * 
 * Direct Sarvam AI execution with zero hardcoded models.
 * Model specified in Layer [L] is passed directly to Sarvam AI.
 */

export * from "@/layers/llm/types";
import type {
  LlmRole,
  LlmMessage,
  SarvamMessage,
  ToolCall,
  LlmChatOptions,
  SarvamChatOptions,
  LlmChatResponse
} from "@/layers/llm/types";

export type SarvamChatResponse = LlmChatResponse;

export interface LLMExecutionResult {
  text: string;
  reasoningContent?: string;
  model: string;
  durationMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Extracts model name directly from any "sarvam/..." or bare model string.
 * Zero hardcoded models.
 */
export function extractModelName(modelInput: string): string {
  if (!modelInput || typeof modelInput !== "string") {
    throw new Error("Missing required Layer [L] model definition.");
  }
  const trimmed = modelInput.trim();
  if (trimmed.includes("/")) {
    return trimmed.split("/").slice(1).join("/");
  }
  if (trimmed.includes(":")) {
    return trimmed.split(":").slice(1).join(":");
  }
  return trimmed;
}

/**
 * Sarvam AI Token Factory Client
 */
export class SarvamClient {
  public static readonly ENDPOINT = "https://api.sarvam.ai/v2/chat/completions";
  public static readonly SYSTEMONE_ENDPOINT = "https://api.sarvam.ai/v2/systemone";

  constructor(private apiKey?: string) {}

  public async chat(
    messages: LlmMessage[],
    options: LlmChatOptions
  ): Promise<LlmChatResponse> {
    const model = extractModelName(options.model);

    // Resolve Sarvam API key
    const key = options.apiKey || this.apiKey || (typeof process !== "undefined" ? process.env?.SARVAM_API_KEY : undefined);
    if (!key) {
      throw new Error("Missing SARVAM_API_KEY. Configure key via .env or options.apiKey.");
    }

    const url = options.endpoint || SarvamClient.ENDPOINT;

    // Dual-header authentication required by Sarvam AI
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "api-subscription-key": key
    };

    const payloadMessages = [...messages];
    if (options.systemPrompt) {
      payloadMessages.unshift({
        role: "system",
        content: options.systemPrompt
      });
    }

    const body: Record<string, any> = {
      model,
      messages: payloadMessages.map((m) => {
        const item: Record<string, any> = {
          role: m.role,
          content: m.content
        };
        if (m.name) item.name = m.name;
        if (m.tool_call_id) item.tool_call_id = m.tool_call_id;
        if (m.tool_calls) item.tool_calls = m.tool_calls;
        return item;
      }),
      max_tokens: options.maxTokens ?? 4096
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
      if (options.toolChoice) {
        body.tool_choice = options.toolChoice;
      }
    }

    if (options.reasoningEffort) {
      body.reasoning_effort = options.reasoningEffort;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Sarvam AI Token Factory error (${response.status}) at ${url}: ${errText}`);
    }

    const data: any = await response.json();
    const choice = data.choices?.[0];

    return {
      text: choice?.message?.content || choice?.message?.reasoning_content || "",
      reasoningContent: choice?.message?.reasoning_content,
      toolCalls: choice?.message?.tool_calls?.map((tc: any) => {
        let args = {};
        try {
          args = typeof tc.function?.arguments === "string" 
            ? JSON.parse(tc.function.arguments) 
            : (tc.function?.arguments || tc.arguments || {});
        } catch {
          args = tc.function?.arguments || tc.arguments || {};
        }
        return {
          id: tc.id || `call_${Date.now()}`,
          name: tc.function?.name || tc.name || "",
          arguments: args
        };
      }),
      model: data.model || model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || data.usage.promptTokens || 0,
        completionTokens: data.usage.completion_tokens || data.usage.completionTokens || 0,
        totalTokens: data.usage.total_tokens || data.usage.totalTokens || 0
      } : undefined
    };
  }

  /**
   * Fast System-One Decisions via Sarvam System-One API
   * Zero hardcoded models: accepts any decision model (e.g. "sarvam-prism", "clef").
   */
  public async decide(
    state: Record<string, any> | string,
    questions: Record<string, any>,
    options?: { model?: string; apiKey?: string }
  ): Promise<any> {
    const key = options?.apiKey || this.apiKey || (typeof process !== "undefined" ? process.env?.SARVAM_API_KEY : undefined);
    if (!key) {
      throw new Error("Missing SARVAM_API_KEY for Sarvam System-One API.");
    }

    const model = options?.model ? extractModelName(options.model) : "sarvam-prism";
    const payloadState = typeof state === "string" ? { input: state } : state;

    const res = await fetch(SarvamClient.SYSTEMONE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "api-subscription-key": key
      },
      body: JSON.stringify({
        model,
        state: payloadState,
        questions
      })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Sarvam System-One error (${res.status}): ${err}`);
    }

    return await res.json();
  }
}

/**
 * Universal Layer [L] Router for Liate
 */
export class LLMRouter {
  private static defaultClient = new SarvamClient();

  public static async chat(
    messages: LlmMessage[],
    options: LlmChatOptions
  ): Promise<LlmChatResponse> {
    const client = options.apiKey ? new SarvamClient(options.apiKey) : this.defaultClient;
    return client.chat(messages, options);
  }

  public static async execute(
    prompt: string,
    model: string,
    systemPrompt?: string,
    apiKey?: string
  ): Promise<LLMExecutionResult> {
    const startTime = Date.now();
    const chatRes = await this.chat(
      [{ role: "user", content: prompt }],
      {
        model,
        systemPrompt,
        apiKey
      }
    );

    return {
      text: chatRes.text,
      reasoningContent: chatRes.reasoningContent,
      model: chatRes.model,
      durationMs: Date.now() - startTime,
      usage: chatRes.usage
    };
  }
}

