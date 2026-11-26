import type { HubLLMDefinition, ProviderDefinition } from "@/layers/llm/types";

/**
 * Strips surrounding quotes and trailing slashes from an env URL string.
 */
export function cleanUrl(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
}

/**
 * Resolves an API key from explicit override or the provider's ordered envKeys list.
 */
export function resolveProviderApiKey(
  provider: ProviderDefinition | string,
  explicitKey?: string
): string | undefined {
  let key = explicitKey;

  if (!key && typeof process !== "undefined" && process.env) {
    if (typeof provider === "string") {
      const upper = provider.toUpperCase();
      key = process.env[`${upper}_API_KEY`] || process.env.OPENAI_API_KEY || process.env.SARVAM_API_KEY;
    } else {
      for (const envVar of provider.envKeys) {
        if (process.env[envVar]) {
          key = process.env[envVar];
          break;
        }
      }
    }
  }

  return key ? key.trim().replace(/^["']|["']$/g, "") : undefined;
}

/**
 * Builds HTTP headers for a provider request given an optional resolved API key.
 */
export function buildProviderHeaders(
  provider: ProviderDefinition,
  apiKey?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (provider.authHeaders) {
    Object.assign(headers, provider.authHeaders(apiKey));
  } else if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return headers;
}

/**
 * Converts a declarative ProviderDefinition into a HubLLMDefinition for inspection/CLI.
 */
export function toHubLLMDefinition(provider: ProviderDefinition): HubLLMDefinition {
  const baseUrl = cleanUrl(provider.baseUrl());
  const endpoint = provider.endpoint ? provider.endpoint() : `${baseUrl}/chat/completions`;
  const modelsEndpoint = provider.modelsEndpoint ? provider.modelsEndpoint() : `${baseUrl}/models`;
  const primaryEnv = provider.envKeys[0];

  const headers: Record<string, string> = provider.defaultHeaders
    ? provider.defaultHeaders()
    : {
        ...(primaryEnv ? { Authorization: `Bearer $${primaryEnv}` } : {}),
        "Content-Type": "application/json"
      };

  const def: HubLLMDefinition = {
    name: provider.id,
    provider: provider.id,
    version: provider.version,
    base_url: baseUrl,
    endpoint,
    models_endpoint: modelsEndpoint,
    headers,
    features: provider.features
  };

  if (provider.ttsEndpoint) def.tts_endpoint = provider.ttsEndpoint();
  if (provider.sttEndpoint) def.stt_endpoint = provider.sttEndpoint();
  if (provider.systemOneEndpoint) def.systemone_endpoint = provider.systemOneEndpoint();

  return def;
}

/**
 * Generic OpenAI-compatible fallback definition for custom or unlisted providers.
 */
export function createOpenAICompatDefinition(providerName: string): HubLLMDefinition {
  return {
    name: providerName,
    provider: providerName,
    version: "v1",
    base_url: "https://api.openai.com/v1",
    endpoint: "https://api.openai.com/v1/chat/completions",
    models_endpoint: "https://api.openai.com/v1/models",
    headers: {
      Authorization: `Bearer $${providerName.toUpperCase()}_API_KEY`,
      "Content-Type": "application/json"
    },
    features: {
      tool_calling: true,
      streaming: true,
      reasoning: true
    }
  };
}
