import type { ProviderDefinition } from "@/layers/llm/types";
import { cleanUrl } from "@/layers/llm/providers/openai-compat";

function resolveNeonBaseUrl(): string {
  const raw = (typeof process !== "undefined" && process.env?.NEON_AI_GATEWAY_BASE_URL)
    ? cleanUrl(process.env.NEON_AI_GATEWAY_BASE_URL)
    : "https://api.ai.neon.tech/v1";
  return raw.endsWith("/v1") ? raw : `${raw}/v1`;
}

export const neonProvider: ProviderDefinition = {
  id: "neon",
  name: "Neon AI Gateway",
  version: "v1",
  baseUrl: resolveNeonBaseUrl,
  envKeys: ["NEON_AI_GATEWAY_TOKEN", "NEON_API_KEY"],
  modelPrefixes: ["claude", "gpt", "gemini", "llama", "mistral"],
  features: {
    tool_calling: true,
    streaming: true,
    reasoning: true
  }
};
