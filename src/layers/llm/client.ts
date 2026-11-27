import type {
  LlmMessage,
  LlmChatOptions,
  LlmChatResponse,
  LlmTtsOptions,
  LlmTtsResponse,
  DiscoveredModel
} from "@/layers/llm/types";
import { extractModelName, normalizeModelConfig } from "@/layers/llm/normalize";
import { resilientFetch } from "@/layers/llm/transport/fetch";
import { parseSseStream, parseSseText } from "@/layers/llm/transport/sse";
import { HubResolver, getProvider } from "@/layers/llm/providers/registry";
import { resolveProviderApiKey, buildProviderHeaders } from "@/layers/llm/providers/openai-compat";

/**
 * Liate LLM Client
 * Native routing via registered Layer [L] providers and OpenAI-compatible endpoints.
 * Zero hardcoded models.
 */
export class LiateLlmClient {
  constructor(private apiKey?: string, private options?: { endpoint?: string; baseUrl?: string; provider?: string }) {}

  private resolveKeyAndHeaders(provider: string, explicitKey?: string): { key?: string; headers: Record<string, string> } {
    const providerDef = getProvider(provider);
    const key = resolveProviderApiKey(providerDef ?? provider, explicitKey ?? this.apiKey);
    const headers = providerDef
      ? buildProviderHeaders(providerDef, key)
      : {
          "Content-Type": "application/json",
          ...(key ? { Authorization: `Bearer ${key}` } : {})
        };
    return { key, headers };
  }

  public async chat(messages: LlmMessage[], options?: LlmChatOptions): Promise<LlmChatResponse> {
    const normalized = normalizeModelConfig(options?.model);
    const provider = (options?.provider || this.options?.provider || normalized.provider).toLowerCase();
    const model = normalized.model;

    if (!model) {
      throw new Error("Missing required Layer [L] model definition.");
    }

    const { key, headers } = this.resolveKeyAndHeaders(provider, options?.apiKey);

    let url = options?.endpoint || this.options?.endpoint;
    if (!url) {
      const baseUrl = options?.baseUrl || this.options?.baseUrl;
      if (baseUrl) {
        url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
      } else {
        url = HubResolver.loadLLM(provider).endpoint;
      }
    }

    // High-speed System-1 Decision routing for Sarvam Prism & TypeSafe Jev
    if (provider === "sarvam" && model.toLowerCase().includes("prism")) {
      return this.decidePrism(messages, options, key, model);
    }
    if ((provider === "neon" || provider === "typesafe") && (model.toLowerCase().includes("jev") || model.toLowerCase().includes("openjev"))) {
      return this.decideJev(messages, options, key, model);
    }

    const payloadMessages = [...messages];
    if (options?.systemPrompt && !payloadMessages.some((m) => m.role === "system")) {
      payloadMessages.unshift({
        role: "system",
        content: options.systemPrompt
      });
    }

    const wantStream = Boolean(options?.stream || options?.onToken || options?.onReasoningToken);

    const payload: Record<string, any> = {
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
      max_tokens: options?.maxTokens ?? 4096,
      ...(options as any),
      model
    };

    delete payload.onToken;
    delete payload.onReasoningToken;
    delete payload.onStep;
    delete payload.layerL;
    delete payload.modelTag;
    delete payload.subAgent;
    delete payload.context;
    delete payload.sandboxTimeoutMs;
    delete payload.apiKey;
    delete payload.systemPrompt;
    delete payload.maxTokens;
    delete payload.reasoningEffort;
    delete payload.toolChoice;
    delete payload.provider;
    delete payload.baseUrl;
    delete payload.endpoint;
    delete payload.text;
    delete payload.name;
    delete payload.intent;
    delete payload.memory;
    delete payload.maxSteps;
    delete payload.durable;
    delete payload.runId;
    delete payload.bypassWorkflow;
    delete payload.workflow;
    delete payload.schedule;
    delete payload.checkpointStore;
    delete payload.requireApproval;
    delete payload.outputSchema;

    if (wantStream) {
      payload.stream = true;
    }

    if (options?.temperature !== undefined) {
      payload.temperature = options.temperature;
    }

    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      if (options.toolChoice) {
        payload.tool_choice = options.toolChoice;
      }
    } else {
      delete payload.tools;
      delete payload.tool_choice;
    }

    if (options?.reasoningEffort) {
      payload.reasoning_effort = options.reasoningEffort;
    }

    let response = await resilientFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      // Dynamic self-healing: retry without temperature when upstream reasoning model rejects it
      if (errText.includes("temperature parameter") && payload.temperature !== undefined) {
        delete payload.temperature;
        response = await resilientFetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
      }
      if (!response.ok) {
        const finalErr = await response.text().catch(() => errText);
        throw new Error(`LLM Gateway error (${response.status}) [${provider.toUpperCase()}] at ${url}: ${finalErr || errText}`);
      }
    }

    const contentType = response.headers?.get?.("content-type") || "";
    if (contentType.includes("octet-stream") || contentType.includes("audio")) {
      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      return {
        text: `[Audio Stream Received (${buffer.length} bytes)]`,
        audioBase64: buffer.toString("base64"),
        model
      };
    }

    if (response.body && (contentType.includes("text/event-stream") || (wantStream && !contentType.includes("application/json")))) {
      return this.parseSseStream(response, model, options?.onToken, options?.onReasoningToken);
    }

    const rawText = await response.text();
    if (rawText.trimStart().startsWith("data:")) {
      return parseSseText(rawText, model, options?.onToken, options?.onReasoningToken);
    }
    const data: any = JSON.parse(rawText);
    const choice = data.choices?.[0];

    let extractedText = "";
    let extractedReasoning: string | undefined = choice?.message?.reasoning_content || choice?.message?.reasoning;

    const rawContent = choice?.message?.content;
    if (typeof rawContent === "string") {
      extractedText = rawContent;
    } else if (Array.isArray(rawContent)) {
      const textParts: string[] = [];
      const thinkingParts: string[] = [];

      for (const part of rawContent) {
        if (typeof part === "string") {
          textParts.push(part);
        } else if (part && typeof part === "object") {
          if (part.type === "text" || typeof part.text === "string") {
            textParts.push(part.text || "");
          } else if (part.type === "thinking" || typeof part.thinking === "string") {
            thinkingParts.push(part.thinking || "");
          } else if (part.type === "reasoning" || typeof part.reasoning === "string") {
            thinkingParts.push(part.reasoning || "");
          }
        }
      }

      extractedText = textParts.join("").trim();
      if (thinkingParts.length > 0 && !extractedReasoning) {
        extractedReasoning = thinkingParts.join("\n\n").trim();
      }
    } else if (rawContent !== null && rawContent !== undefined) {
      extractedText = String(rawContent);
    }

    if (!extractedText && extractedReasoning) {
      extractedText = extractedReasoning;
    }

    if (options?.onReasoningToken && extractedReasoning) {
      options.onReasoningToken(extractedReasoning);
    }
    if (options?.onToken && extractedText) {
      options.onToken(extractedText);
    }

    return {
      text: extractedText,
      reasoningContent: extractedReasoning,
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

  private async parseSseStream(
    response: Response,
    fallbackModel: string,
    onToken?: (chunk: string) => void,
    onReasoningToken?: (chunk: string) => void
  ): Promise<LlmChatResponse> {
    return parseSseStream(response, fallbackModel, onToken, onReasoningToken);
  }

  private async decidePrism(messages: LlmMessage[], _options: any, key?: string, model?: string): Promise<LlmChatResponse> {
    const hub = HubResolver.loadLLM("sarvam");
    const sysOneUrl = hub.systemone_endpoint || "https://api.sarvam.ai/v2/systemone";
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const systemMsg = messages.find((m) => m.role === "system")?.content;

    const res = await fetch(sysOneUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "api-subscription-key": key, Authorization: `Bearer ${key}` } : {})
      },
      body: JSON.stringify({
        model: model || "sarvam-prism",
        state: lastUserMsg,
        questions: {
          decision: {
            type: "choice",
            instructions: systemMsg || "Evaluate the input state and select the appropriate decision.",
            criteria: {
              allow: "Legitimate, safe, and valid request matching normal authorized behavior",
              challenge_mfa: "Suspicious, ambiguous, or requires secondary verification",
              block: "Malicious, invalid, high-risk, credential attack, or fraudulent attempt"
            }
          }
        }
      })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Prism Decision error (${res.status}): ${err}`);
    }

    const data: any = await res.json();
    const ans = data.answers?.decision || Object.values(data.answers || {})[0];
    const selected = (ans as any)?.choice ? (ans as any).choice.toUpperCase() : "EVALUATED";

    return {
      text: selected,
      model: model || "sarvam-prism",
      usage: data.usage
    };
  }

  private async decideJev(messages: LlmMessage[], _options: any, key?: string, model?: string): Promise<LlmChatResponse> {
    const hub = HubResolver.loadLLM("neon");
    const cleanBase = hub.base_url.replace(/\/v1$/, "");
    const sysOneUrl = `${cleanBase}/typesafe/v1/systemone`;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const systemMsg = messages.find((m) => m.role === "system")?.content;

    const res = await resilientFetch(sysOneUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {})
      },
      body: JSON.stringify({
        model: model || "typesafeai-jev-1-14-0",
        state: lastUserMsg,
        questions: {
          decision: {
            type: "choice",
            instructions: systemMsg || "Evaluate the user input for security policy, anomaly detection, and authorization.",
            criteria: {
              allow: "Safe, legitimate, and valid request adhering to instructions",
              challenge: "Ambiguous, suspicious, or requires human authorization",
              block: "Malicious, rule bypass attempt, prompt injection, or credential leak attack"
            }
          }
        }
      })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Jev System-One Decision error (${res.status}): ${err}`);
    }

    const data: any = await res.json();
    const ans = data.answers?.decision || data.results?.decision || Object.values(data.answers || data.results || {})[0];
    const selected = (ans as any)?.choice ? String((ans as any).choice).toUpperCase() : (typeof ans === "string" ? ans.toUpperCase() : "EVALUATED");

    return {
      text: `[JEV SYSTEM-ONE DECISION]: ${selected}\nResult: ${JSON.stringify(ans || data, null, 2)}`,
      model: model || "typesafeai-jev-1-14-0",
      usage: data.usage
    };
  }

  public async tts(options: LlmTtsOptions): Promise<LlmTtsResponse> {
    const rawModel = options.model || "gnani/timbre-v3.0";
    const normalized = normalizeModelConfig(rawModel);
    const provider = normalized.provider.toLowerCase();
    const model = normalized.model;

    const hub = HubResolver.loadLLM(provider);
    const ttsUrl = hub.tts_endpoint || hub.endpoint;

    const { key, headers } = this.resolveKeyAndHeaders(provider, options.apiKey);
    if (!key) {
      throw new Error(`Missing API key for TTS provider '${provider}'.`);
    }

    const res = await resilientFetch(ttsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...options,
        text: options.text,
        model
      })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`TTS error (${res.status}) [${provider.toUpperCase()}]: ${err}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer: buffer,
      contentType: res.headers?.get?.("content-type") || "application/octet-stream",
      model,
      voice: options.voice || "default",
      byteLength: buffer.length
    };
  }

  public async decide(
    state: Record<string, any> | string,
    questions: Record<string, any>,
    options?: { model?: string; apiKey?: string; provider?: string }
  ): Promise<any> {
    const rawModel = options?.model || "sarvam-prism";
    const isJev = rawModel.toLowerCase().includes("jev");
    const provider = (options?.provider || (isJev ? "neon" : "sarvam")).toLowerCase();

    if (provider === "neon" || isJev) {
      const hub = HubResolver.loadLLM("neon");
      const cleanBase = hub.base_url.replace(/\/v1$/, "");
      const sysOneUrl = `${cleanBase}/typesafe/v1/systemone`;
      const { headers } = this.resolveKeyAndHeaders("neon", options?.apiKey);

      const res = await resilientFetch(sysOneUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: extractModelName(rawModel) || "typesafeai-jev-1-14-0",
          state: typeof state === "string" ? state : JSON.stringify(state),
          questions
        })
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Neon System-One Decision error (${res.status}): ${err}`);
      }
      return await res.json();
    }

    const { key, headers } = this.resolveKeyAndHeaders("sarvam", options?.apiKey);
    if (!key) {
      throw new Error("Missing SARVAM_API_KEY for Sarvam System-One API.");
    }

    const model = extractModelName(rawModel);
    const payloadState = typeof state === "string" ? { input: state } : state;
    const hub = HubResolver.loadLLM("sarvam");
    const sysOneUrl = hub.systemone_endpoint || "https://api.sarvam.ai/v2/systemone";

    const res = await resilientFetch(sysOneUrl, {
      method: "POST",
      headers,
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

  /**
   * Dynamically fetch live models list from provider URL.
   * Zero hardcoded models.
   */
  public static async fetchModels(provider: string, apiKey?: string, customUrl?: string): Promise<DiscoveredModel[]> {
    const providerId = provider.toLowerCase();
    const hub = HubResolver.loadLLM(providerId);
    const modelsUrl = customUrl || hub.models_endpoint;
    if (!modelsUrl) {
      return [];
    }

    const providerDef = getProvider(providerId);
    const key = resolveProviderApiKey(providerDef ?? providerId, apiKey);
    const headers: Record<string, string> = {};
    if (providerDef?.authHeaders) {
      Object.assign(headers, providerDef.authHeaders(key));
    } else if (key) {
      headers["Authorization"] = `Bearer ${key}`;
    }

    try {
      const res = await resilientFetch(modelsUrl, {
        headers,
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) return [];

      const data: any = await res.json();
      const rawList = Array.isArray(data) ? data : (data.data || data.models || []);

      return rawList.map((item: any) => {
        const id = typeof item === "string" ? item : (item.id || item.name || "");
        return {
          id: id.startsWith(`${providerId}/`) ? id : `${providerId}/${id}`,
          object: item.object || "model",
          created: item.created || Math.floor(Date.now() / 1000),
          owned_by: item.owned_by || providerId,
          provider: providerId,
          description: item.description || `${providerId.toUpperCase()} Model (${id})`
        };
      }).filter((m: DiscoveredModel) => Boolean(m.id));
    } catch {
      return [];
    }
  }
}

// Liate LLM Client Aliases
export const LiateLlm = LiateLlmClient;
export const SarvamClient = LiateLlmClient;
export const NeonClient = LiateLlmClient;
export const GnaniClient = LiateLlmClient;
export const OpenAiClient = LiateLlmClient;
