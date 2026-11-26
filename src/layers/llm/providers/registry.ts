import type { HubLLMDefinition, ProviderDefinition } from "@/layers/llm/types";
import {
  toHubLLMDefinition,
  createOpenAICompatDefinition
} from "@/layers/llm/providers/openai-compat";
import { sarvamProvider } from "@/layers/llm/providers/sarvam";
import { neonProvider } from "@/layers/llm/providers/neon";
import { gnaniProvider } from "@/layers/llm/providers/gnani";
import { ollamaProvider } from "@/layers/llm/providers/ollama";
import { openrouterProvider } from "@/layers/llm/providers/openrouter";
import { groqProvider } from "@/layers/llm/providers/groq";

/**
 * Built-in Layer [L] Providers.
 * To add a new provider in a PR: create 1 file under providers/ and add it here.
 */
export const BUILTIN_PROVIDERS: ProviderDefinition[] = [
  sarvamProvider,
  neonProvider,
  gnaniProvider,
  ollamaProvider,
  openrouterProvider,
  groqProvider
];

const PROVIDER_MAP = new Map<string, ProviderDefinition>(
  BUILTIN_PROVIDERS.map((p) => [p.id.toLowerCase(), p])
);

export function getProvider(providerName: string): ProviderDefinition | undefined {
  return PROVIDER_MAP.get(providerName.toLowerCase());
}

export function listProviders(): ProviderDefinition[] {
  return [...BUILTIN_PROVIDERS];
}

/**
 * Detects a provider slug from an unprefixed model name using registered modelPrefixes.
 * Defaults to "sarvam" when no registered prefix matches.
 */
export function detectProviderFromModel(modelName: string): string {
  const lower = modelName.toLowerCase();
  for (const p of BUILTIN_PROVIDERS) {
    if (p.modelPrefixes?.some((prefix) => lower.startsWith(prefix))) {
      return p.id;
    }
  }
  return "sarvam";
}

/**
 * Hub Resolver: Gateways for built-in providers and OpenAI-compatible custom gateways.
 */
export class HubResolver {
  public static getBuiltinGateways(): Record<string, HubLLMDefinition> {
    const gateways: Record<string, HubLLMDefinition> = {};
    for (const p of BUILTIN_PROVIDERS) {
      gateways[p.id] = toHubLLMDefinition(p);
    }
    return gateways;
  }

  public static loadLLM(providerName: string): HubLLMDefinition {
    const provider = getProvider(providerName);
    if (provider) {
      return toHubLLMDefinition(provider);
    }
    return createOpenAICompatDefinition(providerName);
  }
}
