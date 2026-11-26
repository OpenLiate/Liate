import type {
  AgentTool,
  KnowledgeContext,
  KnowledgeDoc,
  KnowledgeSourceDefinition,
  VectorKnowledgeConfig
} from "@/layers/integration/types";
import { localFilesKnowledgeSource } from "@/layers/integration/knowledge/sources/local-files";
import { PgVectorSource } from "@/layers/integration/knowledge/sources/pgvector";
import { PineconeSource } from "@/layers/integration/knowledge/sources/pinecone";

/**
 * Pluggable knowledge sources.
 * Contributors add new sources under knowledge/sources/ and register them here.
 */
export const BUILTIN_KNOWLEDGE_SOURCES: KnowledgeSourceDefinition[] = [
  localFilesKnowledgeSource
];

/**
 * Layer [I] Knowledge Manager
 * Resolves local documents, files, and inline facts into structured context for the agent.
 */
export class Knowledge {
  public static async resolve(
    spec: string | string[] | Record<string, any>,
    baseDir: string = process.cwd()
  ): Promise<KnowledgeContext> {
    const documents: KnowledgeDoc[] = [];
    const sources: string[] = [];

    const processItem = async (item: string) => {
      sources.push(item);
      const loader = BUILTIN_KNOWLEDGE_SOURCES.find((s) => s.matches(item, baseDir)) || localFilesKnowledgeSource;
      const loadedDocs = await loader.load(item, baseDir);
      for (const doc of loadedDocs) {
        if (doc.source === "inline" && doc.id.startsWith("inline-")) {
          doc.id = `inline-${documents.length + 1}`;
        }
        documents.push(doc);
      }
    };

    let vectorConfig: VectorKnowledgeConfig | undefined = undefined;

    if (Array.isArray(spec)) {
      for (const item of spec) {
        if (typeof item === "string") await processItem(item);
      }
    } else if (typeof spec === "string") {
      await processItem(spec);
    } else if (typeof spec === "object" && spec !== null) {
      if (Array.isArray(spec.files)) {
        for (const f of spec.files) await processItem(f);
      }
      if (typeof spec.path === "string" || typeof spec.dir === "string") {
        await processItem(spec.path || spec.dir);
      }
      if (typeof spec.vector === "string") {
        vectorConfig = spec as VectorKnowledgeConfig;
      }
    }

    const totalChars = documents.reduce((acc, d) => acc + d.content.length, 0);
    return {
      sources,
      documents,
      totalChars,
      vectorConfig
    };
  }

  /**
   * Ingests documents into a configured vector backend (pgvector / Neon / Supabase / Pinecone).
   */
  public static async ingest(
    docs: KnowledgeDoc[],
    vectorConfig: VectorKnowledgeConfig,
    precomputedVectors?: number[][]
  ): Promise<number> {
    if (vectorConfig.vector.toLowerCase() === "pinecone") {
      return new PineconeSource(vectorConfig).upsert(docs, precomputedVectors);
    }
    const pg = new PgVectorSource(vectorConfig);
    try {
      return await pg.upsert(docs, precomputedVectors);
    } finally {
      await pg.close();
    }
  }

  /**
   * Synthesizes an executable AgentTool for the agent to query and search its knowledge base.
   */
  public static asTool(context: KnowledgeContext): AgentTool {
    return {
      name: "search_knowledge",
      description: "Search documents and reference knowledge configured in Layer [I] Knowledge.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query, topic, or keyword to retrieve from knowledge base." }
        },
        required: ["query"]
      },
      execute: async (args: any) => {
        const query = (args.query || "").trim();
        if (!query) return "Empty query. Provide a search term.";

        if (context.vectorConfig) {
          const isPinecone = context.vectorConfig.vector.toLowerCase() === "pinecone";
          if (isPinecone) {
            const hits = await new PineconeSource(context.vectorConfig).query(query);
            if (hits.length === 0) return "No matching vector documents found in Pinecone.";
            return hits
              .map((h) => `[Source: ${h.source} | score=${h.score.toFixed(3)}]\n${h.content.slice(0, 1500)}`)
              .join("\n\n---\n\n");
          }

          const pg = new PgVectorSource(context.vectorConfig);
          try {
            const hits = await pg.query(query);
            if (hits.length === 0) return "No matching vector documents found in pgvector.";
            return hits
              .map((h) => `[Source: ${h.source} | score=${h.score.toFixed(3)}]\n${h.content.slice(0, 1500)}`)
              .join("\n\n---\n\n");
          } finally {
            await pg.close();
          }
        }

        const queryLower = query.toLowerCase();
        const matches = context.documents
          .map((doc) => {
            const contentLower = doc.content.toLowerCase();
            const queryWords = queryLower.split(/\s+/).filter(Boolean);
            const score = queryWords.reduce((acc: number, w: string) => acc + (contentLower.includes(w) ? 1 : 0), 0);
            return { doc, score };
          })
          .filter((m) => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        if (matches.length === 0) {
          return `No direct matches found in knowledge base (${context.documents.length} docs available).`;
        }

        return matches
          .map((m) => `[Source: ${m.doc.source}]\n${m.doc.content.slice(0, 1500)}`)
          .join("\n\n---\n\n");
      }
    };
  }
}
