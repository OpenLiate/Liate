import type { ProviderDefinition } from "@/layers/llm/types";

export const sarvamProvider: ProviderDefinition = {
  id: "sarvam",
  name: "Sarvam AI",
  version: "v2",
  baseUrl: () => "https://api.sarvam.ai/v2",
  systemOneEndpoint: () => "https://api.sarvam.ai/v2/systemone",
  envKeys: ["SARVAM_API_KEY"],
  defaultHeaders: () => ({
    "api-subscription-key": "$SARVAM_API_KEY",
    Authorization: "Bearer $SARVAM_API_KEY",
    "Content-Type": "application/json"
  }),
  authHeaders: (key): Record<string, string> => {
    if (!key) return {};
    return {
      Authorization: `Bearer ${key}`,
      "api-subscription-key": key
    };
  },
  features: {
    tool_calling: true,
    streaming: true,
    reasoning: true,
    system_one_decisions: true
  }
};
