import type { ProviderDefinition } from "@/layers/llm/types";
import { cleanUrl } from "@/layers/llm/providers/openai-compat";

function resolveGnaniBaseUrl(): string {
  return (typeof process !== "undefined" && process.env?.GNANI_BASE_URL)
    ? cleanUrl(process.env.GNANI_BASE_URL)
    : "https://api.vachana.ai";
}

export const gnaniProvider: ProviderDefinition = {
  id: "gnani",
  name: "Gnani AI",
  version: "v1",
  baseUrl: resolveGnaniBaseUrl,
  endpoint: () => (typeof process !== "undefined" && process.env?.GNANI_ENDPOINT)
    ? process.env.GNANI_ENDPOINT.trim()
    : `${resolveGnaniBaseUrl()}/api/v1/tts/inference`,
  modelsEndpoint: () => `${resolveGnaniBaseUrl()}/v1/models`,
  envKeys: ["GNANI_API_KEY"],
  modelPrefixes: ["prisma", "timbre", "vachana"],
  defaultHeaders: () => ({
    "X-API-Key-ID": "$GNANI_API_KEY",
    Authorization: "Bearer $GNANI_API_KEY",
    "Content-Type": "application/json"
  }),
  authHeaders: (key): Record<string, string> => {
    if (!key) return {};
    return {
      "X-API-Key-ID": key,
      Authorization: `Bearer ${key}`
    };
  },
  features: {
    tool_calling: false,
    streaming: true,
    reasoning: false
  }
};
