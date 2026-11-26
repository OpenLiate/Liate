import type { SingleModelConfig } from "@/core/spec";
import type { NormalizedModel } from "@/layers/llm/types";
import { detectProviderFromModel } from "@/layers/llm/providers/registry";

export { isMultiModelMap, resolveModelTag } from "@/core/spec";

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
 * Normalizes Layer [L] string or SingleModelConfig object into provider and model.
 * Only accepts single-model forms — not a MultiModelMap.
 * Zero hardcoded models.
 */
export function normalizeModelConfig(input?: string | SingleModelConfig): NormalizedModel {
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

    return {
      provider: detectProviderFromModel(trimmed),
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

  const defaultProvider = detectProviderFromModel(modelStr);

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
