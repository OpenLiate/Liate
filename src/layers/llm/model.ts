/**
 * Liate — Layer [L]: Sovereign Large Models & AI Gateway
 * 
 * Supports all OpenAI-compatible endpoints & Indic Sovereign providers:
 * - Sarvam AI (105B Reasoning, Saaras STT, Bulbul TTS, Prism Decisions)
 * - Neon AI Gateway (Serverless Branch-Scoped Models: OpenAI, Anthropic, Gemini, Llama)
 * - Gnani AI (Prisma v3.0 Indic STT, Timbre v3.0 Indic TTS, Vachana AI)
 * - Generic OpenAI-compatible endpoints (Groq, Cerebras, OpenRouter, Ollama)
 * 
 * Zero Hardcoded Models: Any model specified in Layer [L] is passed directly
 * to the target provider. Models are dynamically discovered live from provider URLs.
 */

export * from "@/layers/llm/types";
import type {
  LlmRole,
  LlmMessage,
  SarvamMessage,
  ToolCall,
  LlmChatOptions,
  SarvamChatOptions,
  LlmChatResponse,
  LlmTtsOptions,
  LlmTtsResponse
} from "@/layers/llm/types";
import type { ModelConfig } from "@/core/spec";
import dns from "node:dns";
import https from "node:https";
import http from "node:http";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

/**
 * Resilient HTTP client for Liate.
 * Falls back to public DNS (8.8.8.8) with TLS SNI when local ISP DNS fails on branch hosts.
 */
async function resilientFetch(urlStr: string, options: any = {}): Promise<any> {
  try {
    return await fetch(urlStr, options);
  } catch (err: any) {
    if (err.message?.includes("ENOTFOUND") || err.code === "ENOTFOUND") {
      try {
        const u = new URL(urlStr);
        const ips = await dns.promises.resolve4(u.hostname);
        if (ips && ips.length > 0) {
          return await new Promise((resolve, reject) => {
            const isHttps = u.protocol === "https:";
            const transport = isHttps ? https : http;
            const port = u.port || (isHttps ? 443 : 80);

            const req = transport.request({
              host: ips[0],
              servername: u.hostname,
              port,
              path: `${u.pathname}${u.search}`,
              method: options.method || "GET",
              headers: {
                ...(options.headers || {}),
                Host: u.hostname
              }
            }, (res) => {
              let data = "";
              res.on("data", (chunk) => data += chunk);
              res.on("end", () => {
                resolve({
                  ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
                  status: res.statusCode || 200,
                  statusText: res.statusMessage || "",
                  text: async () => data,
                  json: async () => JSON.parse(data)
                });
              });
            });

            req.on("error", reject);
            if (options.body) {
              req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
            }
            req.end();
          });
        }
      } catch {}
    }
    throw err;
  }
}

export type SarvamChatResponse = LlmChatResponse;

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
 * Extracts raw model name from any "provider/..." or bare model string.
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
 * Normalizes Layer [L] string or ModelConfig object into provider and model.
 * Zero hardcoded models.
 */
export function normalizeModelConfig(input?: string | ModelConfig): NormalizedModel {
  if (!input) {
    throw new Error("Missing required Layer [L] model definition. Specify model string (e.g. 'sarvam/sarvam-105b', 'neon/gpt-5-4-nano', or 'gnani/prisma-v3.0').");
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("Missing required Layer [L] model definition.");
    }

    if (trimmed.includes("/")) {
      const parts = trimmed.split("/");
      return {
        provider: parts[0].toLowerCase(),
        model: parts.slice(1).join("/")
      };
    }

    if (trimmed.includes(":")) {
      const parts = trimmed.split(":");
      return {
        provider: parts[0].toLowerCase(),
        model: parts.slice(1).join(":")
      };
    }

    // Dynamic heuristic if no prefix given
    const lower = trimmed.toLowerCase();
    let detectedProvider = "sarvam";
    if (lower.startsWith("prisma") || lower.startsWith("timbre") || lower.startsWith("vachana")) {
      detectedProvider = "gnani";
    } else if (lower.startsWith("claude") || lower.startsWith("gpt") || lower.startsWith("gemini") || lower.startsWith("llama") || lower.startsWith("mistral")) {
      detectedProvider = "neon";
    }

    return {
      provider: detectedProvider,
      model: trimmed
    };
  }

  let providerStr = input.provider;
  let modelStr = input.model;

  if (!providerStr && modelStr && (modelStr.includes("/") || modelStr.includes(":"))) {
    const sep = modelStr.includes("/") ? "/" : ":";
    const parts = modelStr.split(sep);
    providerStr = parts[0];
    modelStr = parts.slice(1).join(sep);
  }

  if (!modelStr) {
    throw new Error("Missing required Layer [L] model. Specify a model property (e.g. 'sarvam-105b' or 'gpt-5-4-nano').");
  }

  const lowerModel = modelStr.toLowerCase();
  let defaultProvider = "sarvam";
  if (lowerModel.startsWith("prisma") || lowerModel.startsWith("timbre") || lowerModel.startsWith("vachana")) {
    defaultProvider = "gnani";
  } else if (lowerModel.startsWith("claude") || lowerModel.startsWith("gpt") || lowerModel.startsWith("gemini")) {
    defaultProvider = "neon";
  }

  return {
    provider: (providerStr || defaultProvider).toLowerCase(),
    model: modelStr,
    baseUrl: input.baseUrl,
    endpoint: (input as any).endpoint || input.baseUrl,
    apiKey: input.apiKey,
    temperature: input.temperature,
    maxTokens: input.maxTokens
  };
}

/**
 * Hub Resolver: Gateways for Sarvam AI, Neon AI Gateway, Gnani AI, and Custom Gateways.
 */
export class HubResolver {
  public static getBuiltinGateways(): Record<string, HubLLMDefinition> {
    const rawNeon = (typeof process !== "undefined" && process.env?.NEON_AI_GATEWAY_BASE_URL)
      ? process.env.NEON_AI_GATEWAY_BASE_URL.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "")
      : "https://api.ai.neon.tech/v1";
    const neonBaseUrl = rawNeon.endsWith("/v1") ? rawNeon : `${rawNeon}/v1`;

    const rawGnani = (typeof process !== "undefined" && process.env?.GNANI_BASE_URL)
      ? process.env.GNANI_BASE_URL.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "")
      : "https://api.vachana.ai";

    return {
      sarvam: {
        name: "sarvam",
        provider: "sarvam",
        version: "v2",
        base_url: "https://api.sarvam.ai/v2",
        endpoint: "https://api.sarvam.ai/v2/chat/completions",
        models_endpoint: "https://api.sarvam.ai/v2/models",
        systemone_endpoint: "https://api.sarvam.ai/v2/systemone",
        headers: {
          "api-subscription-key": "$SARVAM_API_KEY",
          "Authorization": "Bearer $SARVAM_API_KEY",
          "Content-Type": "application/json"
        },
        features: {
          tool_calling: true,
          streaming: true,
          reasoning: true,
          system_one_decisions: true
        }
      },
      neon: {
        name: "neon",
        provider: "neon",
        version: "v1",
        base_url: neonBaseUrl,
        endpoint: `${neonBaseUrl}/chat/completions`,
        models_endpoint: `${neonBaseUrl}/models`,
        headers: {
          "Authorization": "Bearer $NEON_AI_GATEWAY_TOKEN",
          "Content-Type": "application/json"
        },
        features: {
          tool_calling: true,
          streaming: true,
          reasoning: true
        }
      },
      gnani: {
        name: "gnani",
        provider: "gnani",
        version: "v1",
        base_url: rawGnani,
        endpoint: (typeof process !== "undefined" && process.env?.GNANI_ENDPOINT)
          ? process.env.GNANI_ENDPOINT.trim()
          : `${rawGnani}/api/v1/tts/inference`,
        models_endpoint: `${rawGnani}/v1/models`,
        headers: {
          "X-API-Key-ID": "$GNANI_API_KEY",
          "Authorization": "Bearer $GNANI_API_KEY",
          "Content-Type": "application/json"
        },
        features: {
          tool_calling: false,
          streaming: true,
          reasoning: false
        }
      }
    };
  }

  public static loadLLM(providerName: string): HubLLMDefinition {
    const builtins = this.getBuiltinGateways();
    const key = providerName.toLowerCase();
    if (builtins[key]) {
      return builtins[key];
    }

    // Default dynamic OpenAI-compatible gateway
    return {
      name: providerName,
      provider: providerName,
      version: "v1",
      base_url: "https://api.openai.com/v1",
      endpoint: "https://api.openai.com/v1/chat/completions",
      models_endpoint: "https://api.openai.com/v1/models",
      headers: {
        "Authorization": `Bearer $${providerName.toUpperCase()}_API_KEY`,
        "Content-Type": "application/json"
      },
      features: {
        tool_calling: true,
        streaming: true,
        reasoning: true
      }
    };
  }
}

/**
 * Liate LLM Client
 * Native routing for Sarvam AI, Neon AI Gateway, Gnani AI, and OpenAI-compatible endpoints.
 * Zero hardcoded models.
 */
export class LiateLlmClient {
  constructor(private apiKey?: string, private options?: { endpoint?: string; baseUrl?: string; provider?: string }) {}

  public async chat(messages: LlmMessage[], options?: LlmChatOptions): Promise<LlmChatResponse> {
    const normalized = normalizeModelConfig(options?.model || "sarvam/sarvam-105b");
    const provider = (options?.provider || this.options?.provider || normalized.provider).toLowerCase();
    const model = normalized.model;

    if (!model) {
      throw new Error("Missing required Layer [L] model definition.");
    }

    // Resolve Provider API Key
    let key = options?.apiKey || this.apiKey;
    if (!key && typeof process !== "undefined" && process.env) {
      if (provider === "neon") {
        key = process.env.NEON_AI_GATEWAY_TOKEN || process.env.NEON_API_KEY;
      } else if (provider === "gnani") {
        key = process.env.GNANI_API_KEY;
      } else if (provider === "sarvam") {
        key = process.env.SARVAM_API_KEY;
      } else {
        key = process.env[`${provider.toUpperCase()}_API_KEY`] || process.env.OPENAI_API_KEY || process.env.SARVAM_API_KEY;
      }
    }
    if (key) {
      key = key.trim().replace(/^["']|["']$/g, "");
    }

    // Resolve Endpoint URL
    let url = options?.endpoint || this.options?.endpoint;
    if (!url) {
      const baseUrl = options?.baseUrl || this.options?.baseUrl;
      if (baseUrl) {
        const cleanBase = baseUrl.replace(/\/+$/, "");
        url = `${cleanBase}/chat/completions`;
      } else {
        const hub = HubResolver.loadLLM(provider);
        url = hub.endpoint;
      }
    }

    // High-speed System-1 Decision routing for Sarvam Prism & TypeSafe Jev
    if (provider === "sarvam" && model.toLowerCase().includes("prism") && (options as any)?.decide) {
      return this.decidePrism(messages, options, key, model);
    }
    if ((provider === "neon" || provider === "typesafe") && (model.toLowerCase().includes("jev") || model.toLowerCase().includes("openjev"))) {
      return this.decideJev(messages, options, key, model);
    }

    const payloadMessages = [...messages];
    if (options?.systemPrompt && !payloadMessages.some(m => m.role === "system")) {
      payloadMessages.unshift({
        role: "system",
        content: options.systemPrompt
      });
    }

    const lastUserText = [...payloadMessages].reverse().find((m) => m.role === "user")?.content || "";

    const payload: Record<string, any> = {
      text: lastUserText,
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
      model: extractModelName(model)
    };

    if (options?.temperature !== undefined) {
      payload.temperature = options.temperature;
    }

    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      if (options.toolChoice) {
        payload.tool_choice = options.toolChoice;
      }
    }

    if (options?.reasoningEffort) {
      payload.reasoning_effort = options.reasoningEffort;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (key) {
      if (provider === "neon") {
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider === "gnani") {
        headers["X-API-Key-ID"] = key;
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider === "sarvam") {
        headers["Authorization"] = `Bearer ${key}`;
        headers["api-subscription-key"] = key; // Sarvam AI dual-header compatibility
      } else {
        headers["Authorization"] = `Bearer ${key}`;
      }
    }

    let response = await resilientFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      // Dynamic self-healing: if upstream frontier model rejects temperature (e.g. Claude Fable / Opus reasoning models), retry without temperature
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

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("octet-stream") || contentType.includes("audio")) {
      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      return {
        text: `[Audio Stream Received (${buffer.length} bytes)]`,
        audioBase64: buffer.toString("base64"),
        model
      };
    }

    const data: any = await response.json();
    const choice = data.choices?.[0];

    // Robust parsing for modern 2026 multi-modal & reasoning content blocks
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

  private async decidePrism(messages: LlmMessage[], options: any, key?: string, model?: string): Promise<LlmChatResponse> {
    const hub = HubResolver.loadLLM("sarvam");
    const sysOneUrl = hub.systemone_endpoint || "https://api.sarvam.ai/v2/systemone";
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const systemMsg = messages.find((m) => m.role === "system")?.content;

    const res = await fetch(sysOneUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "api-subscription-key": key, "Authorization": `Bearer ${key}` } : {})
      },
      body: JSON.stringify({
        input: lastUserMsg,
        options: {
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

  private async decideJev(messages: LlmMessage[], options: any, key?: string, model?: string): Promise<LlmChatResponse> {
    const hub = HubResolver.loadLLM("neon");
    const cleanBase = hub.base_url.replace(/\/v1$/, "");
    const sysOneUrl = `${cleanBase}/typesafe/v1/systemone`;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const systemMsg = messages.find((m) => m.role === "system")?.content;

    const res = await resilientFetch(sysOneUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "Authorization": `Bearer ${key}` } : {})
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

    let key = options.apiKey || this.apiKey;
    if (!key && typeof process !== "undefined" && process.env) {
      if (provider === "gnani") key = process.env.GNANI_API_KEY;
      else if (provider === "sarvam") key = process.env.SARVAM_API_KEY;
      else key = process.env[`${provider.toUpperCase()}_API_KEY`];
    }
    if (!key) {
      throw new Error(`Missing API key for TTS provider '${provider}'.`);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (provider === "gnani") {
      headers["X-API-Key-ID"] = key.trim();
    } else {
      headers["Authorization"] = `Bearer ${key.trim()}`;
    }

    const payload: Record<string, any> = {
      ...options,
      text: options.text,
      model
    };

    const res = await resilientFetch(ttsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`TTS error (${res.status}) [${provider.toUpperCase()}]: ${err}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer: buffer,
      contentType: res.headers.get("content-type") || "application/octet-stream",
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
      const key = options?.apiKey || this.apiKey || (typeof process !== "undefined" ? (process.env?.NEON_AI_GATEWAY_TOKEN || process.env?.NEON_API_KEY) : undefined);

      const res = await resilientFetch(sysOneUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { "Authorization": `Bearer ${key}` } : {})
        },
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

    const key = options?.apiKey || this.apiKey || (typeof process !== "undefined" ? process.env?.SARVAM_API_KEY : undefined);
    if (!key) {
      throw new Error("Missing SARVAM_API_KEY for Sarvam System-One API.");
    }

    const model = extractModelName(rawModel);
    const payloadState = typeof state === "string" ? { input: state } : state;

    const res = await resilientFetch("https://api.sarvam.ai/v2/systemone", {
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

  /**
   * Dynamically fetch live models list from provider URL.
   * Zero hardcoded models.
   */
  public static async fetchModels(provider: string, apiKey?: string, customUrl?: string): Promise<DiscoveredModel[]> {
    const hub = HubResolver.loadLLM(provider);
    const modelsUrl = customUrl || hub.models_endpoint;
    if (!modelsUrl) {
      return [];
    }

    let key = apiKey;
    if (!key && typeof process !== "undefined" && process.env) {
      if (provider === "neon") key = process.env.NEON_AI_GATEWAY_TOKEN || process.env.NEON_API_KEY;
      else if (provider === "gnani") key = process.env.GNANI_API_KEY;
      else if (provider === "sarvam") key = process.env.SARVAM_API_KEY;
      else key = process.env[`${provider.toUpperCase()}_API_KEY`] || process.env.OPENAI_API_KEY;
    }
    if (key) {
      key = key.trim().replace(/^["']|["']$/g, "");
    }

    const headers: Record<string, string> = {};
    if (key) {
      if (provider === "neon") {
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider === "gnani") {
        headers["X-API-Key-ID"] = key;
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider === "sarvam") {
        headers["Authorization"] = `Bearer ${key}`;
        headers["api-subscription-key"] = key;
      } else {
        headers["Authorization"] = `Bearer ${key}`;
      }
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
          id: id.includes("/") ? id : `${provider}/${id}`,
          object: item.object || "model",
          created: item.created || Math.floor(Date.now() / 1000),
          owned_by: item.owned_by || provider,
          provider,
          description: item.description || `${provider.toUpperCase()} Model (${id})`
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
   * Live Dynamic Model Discovery from Providers.
   * Zero hardcoded models.
   */
  public static async listModels(provider?: string, apiKey?: string): Promise<DiscoveredModel[]> {
    if (provider) {
      return LiateLlmClient.fetchModels(provider.toLowerCase(), apiKey);
    }

    // Parallel fetch from all builtin providers
    const providers = ["sarvam", "neon", "gnani"];
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
