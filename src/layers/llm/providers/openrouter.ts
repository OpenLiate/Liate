import type { ProviderDefinition } from "@/layers/llm/types";
import { cleanUrl } from "@/layers/llm/providers/openai-compat";

function resolveOpenRouterBaseUrl(): string {
  const raw = (typeof process !== "undefined" && process.env?.OPENROUTER_BASE_URL)
    ? cleanUrl(process.env.OPENROUTER_BASE_URL)
    : "https://openrouter.ai/api/v1";
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

function openRouterAttributionHeaders(): Record<string, string> {
  const referer = (typeof process !== "undefined" && process.env?.OPENROUTER_REFERER) || "https://liate.dev";
  const title = (typeof process !== "undefined" && process.env?.OPENROUTER_TITLE) || "Liate";
  return {
    "HTTP-Referer": referer,
    "X-Title": title,
    "X-OpenRouter-Title": title
  };
}

export const openrouterProvider: ProviderDefinition = {
  id: "openrouter",
  name: "OpenRouter",
  version: "v1",
  baseUrl: resolveOpenRouterBaseUrl,
  envKeys: ["OPENROUTER_API_KEY"],
  defaultHeaders: () => ({
    Authorization: "Bearer $OPENROUTER_API_KEY",
    ...openRouterAttributionHeaders(),
    "Content-Type": "application/json"
  }),
  authHeaders: (key) => ({
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
    ...openRouterAttributionHeaders()
  }),
  features: {
    tool_calling: true,
    streaming: true,
    reasoning: true
  }
};
