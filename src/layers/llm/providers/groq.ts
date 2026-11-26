import type { ProviderDefinition } from "@/layers/llm/types";
import { cleanUrl } from "@/layers/llm/providers/openai-compat";

function resolveGroqBaseUrl(): string {
  const raw = (typeof process !== "undefined" && process.env?.GROQ_BASE_URL)
    ? cleanUrl(process.env.GROQ_BASE_URL)
    : "https://api.groq.com/openai/v1";
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

export const groqProvider: ProviderDefinition = {
  id: "groq",
  name: "Groq",
  version: "v1",
  baseUrl: resolveGroqBaseUrl,
  envKeys: ["GROQ_API_KEY"],
  defaultHeaders: () => ({
    Authorization: "Bearer $GROQ_API_KEY",
    "Content-Type": "application/json"
  }),
  authHeaders: (key): Record<string, string> => {
    if (!key) return {};
    return {
      Authorization: `Bearer ${key}`
    };
  },
  features: {
    tool_calling: true,
    streaming: true,
    reasoning: true
  }
};
