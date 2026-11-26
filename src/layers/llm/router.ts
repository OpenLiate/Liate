import type {
  LlmMessage,
  LlmChatOptions,
  LlmChatResponse,
  LLMExecutionResult,
  DiscoveredModel
} from "@/layers/llm/types";
import { normalizeModelConfig } from "@/layers/llm/normalize";
import { LiateLlmClient } from "@/layers/llm/client";
import { listProviders } from "@/layers/llm/providers/registry";

/**
 * Layer [L] Router for Liate
 */
export class LLMRouter {
  private static defaultClient = new LiateLlmClient();

  public static async chat(
    messages: LlmMessage[],
    options: LlmChatOptions
  ): Promise<LlmChatResponse> {
    const client = options.apiKey ? new LiateLlmClient(options.apiKey) : this.defaultClient;
    return client.chat(messages, options);
  }

  public static async execute(
    prompt: string,
    model: string,
    systemPrompt?: string,
    apiKey?: string
  ): Promise<LLMExecutionResult> {
    const startTime = Date.now();
    const normalized = normalizeModelConfig(model);

    const chatRes = await this.chat(
      [{ role: "user", content: prompt }],
      {
        model: `${normalized.provider}/${normalized.model}`,
        systemPrompt,
        apiKey
      }
    );

    return {
      text: chatRes.text,
      reasoningContent: chatRes.reasoningContent,
      provider: normalized.provider,
      model: chatRes.model,
      durationMs: Date.now() - startTime,
      usage: chatRes.usage
    };
  }

  /**
   * Live Dynamic Model Discovery across all registered providers.
   * Zero hardcoded models.
   */
  public static async listModels(provider?: string, apiKey?: string): Promise<DiscoveredModel[]> {
    if (provider) {
      return LiateLlmClient.fetchModels(provider.toLowerCase(), apiKey);
    }

    const providers = listProviders().map((p) => p.id);
    const results = await Promise.allSettled(
      providers.map((p) => LiateLlmClient.fetchModels(p))
    );

    const combined: DiscoveredModel[] = [];
    const seen = new Set<string>();

    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const m of r.value) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            combined.push(m);
          }
        }
      }
    }

    return combined;
  }
}
