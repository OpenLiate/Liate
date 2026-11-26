import type { KnowledgeDoc, VectorKnowledgeConfig } from "@/layers/integration/types";
import { embedTexts } from "@/layers/integration/knowledge/embeddings";
import type { VectorSearchHit } from "@/layers/integration/knowledge/sources/pgvector";

const DEFAULT_PINECONE_API_VERSION = "2026-07";

function resolveEnvRef(val?: string): string | undefined {
  if (!val) return undefined;
  if (val.startsWith("$")) {
    return process.env[val.slice(1)]?.trim();
  }
  return val.trim();
}

/**
 * Layer [I] Pinecone Vector Knowledge Source (2026 REST API with X-Pinecone-Api-Version)
 * Zero extra npm packages — uses native fetch against Pinecone's index host.
 */
export class PineconeSource {
  private readonly host: string;
  private readonly apiKey: string;
  private readonly apiVersion: string;
  private readonly namespace?: string;

  constructor(private config: VectorKnowledgeConfig) {
    const rawHost = resolveEnvRef(config.indexHost) || process.env.PINECONE_INDEX_HOST?.trim() || "";
    this.host = rawHost.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    this.apiKey = resolveEnvRef(config.apiKey) || process.env.PINECONE_API_KEY?.trim() || "";
    this.apiVersion = process.env.PINECONE_API_VERSION?.trim() || DEFAULT_PINECONE_API_VERSION;
    this.namespace = config.namespace;
  }

  private assertConfigured() {
    if (!this.host || !this.apiKey) {
      throw new Error(
        "[Liate Knowledge Error]: Pinecone requires PINECONE_INDEX_HOST (indexHost) and PINECONE_API_KEY."
      );
    }
  }

  private headers(): Record<string, string> {
    return {
      "Api-Key": this.apiKey,
      "Content-Type": "application/json",
      "X-Pinecone-Api-Version": this.apiVersion
    };
  }

  public async upsert(docs: KnowledgeDoc[], precomputedVectors?: number[][]): Promise<number> {
    this.assertConfigured();
    if (!docs.length) return 0;

    const vectors = precomputedVectors ?? await embedTexts(
      docs.map((d) => d.content),
      this.config.embedModel,
      { apiKey: this.config.embedApiKey }
    );

    const payload: Record<string, any> = {
      vectors: docs.map((d, i) => ({
        id: d.id,
        values: vectors[i],
        metadata: {
          source: d.source,
          content: d.content,
          ...(d.metadata || {})
        }
      }))
    };
    if (this.namespace) payload.namespace = this.namespace;

    const res = await fetch(`https://${this.host}/vectors/upsert`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Pinecone upsert error (${res.status}): ${err}`);
    }
    return docs.length;
  }

  public async query(queryText: string, queryVector?: number[]): Promise<VectorSearchHit[]> {
    this.assertConfigured();
    const vector = queryVector ?? (await embedTexts([queryText], this.config.embedModel, {
      apiKey: this.config.embedApiKey
    }))[0];
    if (!vector) return [];

    const payload: Record<string, any> = {
      vector,
      topK: this.config.topK ?? 5,
      includeMetadata: true
    };
    if (this.namespace) payload.namespace = this.namespace;

    const res = await fetch(`https://${this.host}/query`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Pinecone query error (${res.status}): ${err}`);
    }

    const data: any = await res.json();
    return (data.matches || []).map((m: any) => ({
      id: m.id,
      source: m.metadata?.source || "pinecone",
      content: m.metadata?.content || "",
      score: Number(m.score ?? 0),
      metadata: m.metadata
    }));
  }
}
