import type { ProviderDefinition } from "@/layers/llm/types";
import { cleanUrl } from "@/layers/llm/providers/openai-compat";

function resolveOllamaBaseUrl(): string {
  const raw = (typeof process !== "undefined" && (process.env?.OLLAMA_BASE_URL || process.env?.OLLAMA_HOST))
    ? cleanUrl(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || "")
    : "http://localhost:11434/v1";
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

export const ollamaProvider: ProviderDefinition = {
  id: "ollama",
  name: "Ollama",
  version: "v1",
  baseUrl: resolveOllamaBaseUrl,
  envKeys: ["OLLAMA_API_KEY"],
  defaultHeaders: () => ({
    "Content-Type": "application/json"
  }),
  features: {
    tool_calling: true,
    streaming: true,
    reasoning: true
  }
};
