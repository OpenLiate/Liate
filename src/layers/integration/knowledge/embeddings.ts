import { normalizeModelConfig } from "@/layers/llm/normalize";
import { HubResolver, getProvider } from "@/layers/llm/providers/registry";
import { buildProviderHeaders, resolveProviderApiKey } from "@/layers/llm/providers/openai-compat";
import { resilientFetch } from "@/layers/llm/transport/fetch";

/**
 * Layer [I] Dynamic Embeddings Client
 * Calls any OpenAI-compatible /embeddings endpoint using an explicit Layer [L] model slug.
 * Zero hardcoded embedding models.
 */
export async function embedTexts(
  texts: string[],
  embedModel: string,
  options?: { apiKey?: string; baseUrl?: string }
): Promise<number[][]> {
  if (!embedModel || typeof embedModel !== "string") {
    throw new Error(
      "[Liate Knowledge Error]: Missing required 'embedModel' for vector knowledge. OpenLiate never hardcodes embedding models."
    );
  }
  if (!texts || texts.length === 0) return [];

  const normalized = normalizeModelConfig(embedModel);
  const provider = normalized.provider.toLowerCase();
  const model = normalized.model;

  const providerDef = getProvider(provider);
  const key = resolveProviderApiKey(providerDef ?? provider, options?.apiKey);
  const headers = providerDef
    ? buildProviderHeaders(providerDef, key)
    : {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {})
      };

  const baseUrl = options?.baseUrl
    ? options.baseUrl.replace(/\/+$/, "")
    : HubResolver.loadLLM(provider).base_url.replace(/\/+$/, "");
  const url = `${baseUrl}/embeddings`;

  const res = await resilientFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      input: texts
    })
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Embeddings error (${res.status}) [${provider.toUpperCase()}] at ${url}: ${err}`);
  }

  const data: any = await res.json();
  if (!Array.isArray(data.data)) {
    throw new Error(`Invalid embeddings response from ${provider}: missing data[]`);
  }

  return data.data
    .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
    .map((item: any) => item.embedding as number[]);
}
