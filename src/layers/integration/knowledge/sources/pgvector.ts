import type { KnowledgeDoc, VectorKnowledgeConfig } from "@/layers/integration/types";
import { embedTexts } from "@/layers/integration/knowledge/embeddings";

export interface VectorSearchHit {
  id: string;
  source: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * Resolves a pgvector connection string for local Postgres, Neon, or Supabase.
 */
export function resolvePgVectorUrl(vectorTarget: string): string {
  const lower = vectorTarget.toLowerCase();
  if (lower === "neon" || lower.startsWith("neon://")) {
    return process.env.NEON_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  }
  if (lower === "supabase" || lower.startsWith("supabase://")) {
    return (
      process.env.SUPABASE_DB_URL?.trim() ||
      process.env.SUPABASE_DATABASE_URL?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      ""
    );
  }
  if (lower === "pgvector" || lower === "postgres" || lower === "postgresql") {
    return process.env.DATABASE_URL?.trim() || "";
  }
  return vectorTarget;
}

function sanitizeIdentifier(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (!clean) throw new Error("[Liate Knowledge Error]: Invalid pgvector table name.");
  return clean;
}

/**
 * Layer [I] pgvector Knowledge Source (2026 HNSW + Cosine Distance <=>)
 * Works identically on Local Docker pgvector, Cloud Neon pgvector, and Cloud Supabase pgvector via Bun.SQL.
 */
export class PgVectorSource {
  private sqlClient: any = null;
  private initialized = false;
  private readonly tableName: string;
  private readonly connectionUrl: string;

  constructor(private config: VectorKnowledgeConfig) {
    this.tableName = sanitizeIdentifier(config.table || "liate_knowledge");
    this.connectionUrl = resolvePgVectorUrl(config.vector);
  }

  private async getSql(dimensions?: number) {
    if (!this.connectionUrl) {
      throw new Error(
        "[Liate Knowledge Error]: Missing pgvector connection URL. Set DATABASE_URL, NEON_DATABASE_URL, or SUPABASE_DB_URL, or pass a postgresql:// URI."
      );
    }
    if (!this.sqlClient) {
      const BunSQL = (globalThis as any).Bun?.SQL;
      if (!BunSQL) {
        throw new Error("[Liate Knowledge Error]: Native Bun.SQL is required for pgvector.");
      }
      this.sqlClient = new BunSQL(this.connectionUrl);
    }
    if (!this.initialized) {
      const dimClause = dimensions ? `(${dimensions})` : "";
      await this.sqlClient.unsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
      await this.sqlClient.unsafe(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          embedding vector${dimClause}
        )
      `);
      if (dimensions) {
        await this.sqlClient.unsafe(`
          CREATE INDEX IF NOT EXISTS ${this.tableName}_cosine_hnsw_idx
          ON ${this.tableName}
          USING hnsw (embedding vector_cosine_ops)
        `);
      }
      this.initialized = true;
    }
    return this.sqlClient;
  }

  public async upsert(docs: KnowledgeDoc[], precomputedVectors?: number[][]): Promise<number> {
    if (!docs.length) return 0;
    const vectors = precomputedVectors ?? await embedTexts(
      docs.map((d) => d.content),
      this.config.embedModel,
      { apiKey: this.config.embedApiKey }
    );
    const dims = vectors[0]?.length;
    const sql = await this.getSql(dims);

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const vecLiteral = `[${vectors[i].join(",")}]`;
      const metaJson = JSON.stringify(doc.metadata || {});
      await sql.unsafe(
        `INSERT INTO ${this.tableName} (id, source, content, metadata, embedding)
         VALUES ($1, $2, $3, $4::jsonb, $5::vector)
         ON CONFLICT (id) DO UPDATE SET
           source = EXCLUDED.source,
           content = EXCLUDED.content,
           metadata = EXCLUDED.metadata,
           embedding = EXCLUDED.embedding`,
        [doc.id, doc.source, doc.content, metaJson, vecLiteral]
      );
    }
    return docs.length;
  }

  public async query(queryText: string, queryVector?: number[]): Promise<VectorSearchHit[]> {
    const vector = queryVector ?? (await embedTexts([queryText], this.config.embedModel, {
      apiKey: this.config.embedApiKey
    }))[0];
    if (!vector) return [];

    const sql = await this.getSql(vector.length);
    const topK = this.config.topK ?? 5;
    const vecLiteral = `[${vector.join(",")}]`;

    const rows = await sql.unsafe(
      `SELECT id, source, content, metadata, 1 - (embedding <=> $1::vector) AS score
       FROM ${this.tableName}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vecLiteral, topK]
    );

    return (rows || []).map((r: any) => ({
      id: r.id,
      source: r.source,
      content: r.content,
      score: Number(r.score ?? 0),
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata
    }));
  }

  public async close(): Promise<void> {
    if (this.sqlClient?.close) {
      await this.sqlClient.close();
      this.sqlClient = null;
      this.initialized = false;
    }
  }
}
