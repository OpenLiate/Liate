import fs from "node:fs";
import path from "node:path";
import type { AgentTool, IntegrationConfig, KnowledgeContext, KnowledgeDoc, MemoryProvider } from "@/layers/integration/types";
import { Session } from "@/layers/integration/memory";

/**
 * Layer [I] Knowledge Manager
 * Resolves local documents, files, and inline facts into structured context for the agent.
 */
export class Knowledge {
  /**
   * Resolves Layer [I] Knowledge specifications from file paths, directories, or inline texts.
   */
  public static async resolve(
    spec: string | string[] | Record<string, any>,
    baseDir: string = process.cwd()
  ): Promise<KnowledgeContext> {
    const documents: KnowledgeDoc[] = [];
    const sources: string[] = [];

    const processItem = (item: string) => {
      sources.push(item);
      const resolved = path.isAbsolute(item) ? item : path.resolve(baseDir, item);

      if (fs.existsSync(resolved)) {
        const stats = fs.statSync(resolved);
        if (stats.isDirectory()) {
          const files = this.scanDir(resolved);
          for (const file of files.slice(0, 50)) {
            try {
              const content = fs.readFileSync(file, "utf-8").slice(0, 50000);
              const rel = path.relative(baseDir, file);
              documents.push({
                id: rel,
                source: rel,
                title: path.basename(file),
                content
              });
            } catch {}
          }
        } else if (stats.isFile()) {
          try {
            const content = fs.readFileSync(resolved, "utf-8").slice(0, 50000);
            documents.push({
              id: item,
              source: item,
              title: path.basename(resolved),
              content
            });
          } catch {}
        }
      } else {
        // Treat as inline knowledge snippet / factual string
        documents.push({
          id: `inline-${documents.length + 1}`,
          source: "inline",
          content: item
        });
      }
    };

    if (Array.isArray(spec)) {
      for (const item of spec) {
        if (typeof item === "string") processItem(item);
      }
    } else if (typeof spec === "string") {
      processItem(spec);
    } else if (typeof spec === "object" && spec !== null) {
      if (Array.isArray(spec.files)) {
        for (const f of spec.files) processItem(f);
      }
      if (typeof spec.path === "string" || typeof spec.dir === "string") {
        processItem(spec.path || spec.dir);
      }
    }

    const totalChars = documents.reduce((acc, d) => acc + d.content.length, 0);
    return {
      sources,
      documents,
      totalChars
    };
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
        const query = (args.query || "").toLowerCase().trim();
        if (!query) return "Empty query. Provide a search term.";

        const matches = context.documents
          .map((doc) => {
            const contentLower = doc.content.toLowerCase();
            const queryWords = query.split(/\s+/).filter(Boolean);
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

  private static scanDir(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
            results.push(...this.scanDir(full));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if ([".md", ".txt", ".json", ".csv", ".yaml", ".yml"].includes(ext)) {
            results.push(full);
          }
        }
      }
    } catch {}
    return results;
  }
}

/**
 * Universal Integration Resolver for Layer [I]
 */
export class IntegrationResolver {
  public static resolveMemory(
    config?: string | IntegrationConfig | MemoryProvider,
    metadata?: Record<string, any>,
    sessionId?: string
  ): MemoryProvider {
    if (!config) {
      return new Session(sessionId || "ephemeral", metadata);
    }

    if (typeof config === "object" && "append" in config && "getMessages" in config) {
      return config as MemoryProvider;
    }

    const memoryTarget = typeof config === "string" ? config : (config.memory || config.type);
    return new Session(memoryTarget, metadata);
  }

  public static async resolveKnowledge(
    config?: string | string[] | IntegrationConfig,
    baseDir?: string
  ): Promise<KnowledgeContext | undefined> {
    if (!config) return undefined;
    const spec = typeof config === "object" && !Array.isArray(config) ? config.knowledge : config;
    if (!spec) return undefined;
    return Knowledge.resolve(spec, baseDir);
  }

  public static async resolveKnowledgeTool(
    config?: string | string[] | IntegrationConfig,
    baseDir?: string
  ): Promise<AgentTool | undefined> {
    const context = await this.resolveKnowledge(config, baseDir);
    if (!context || context.documents.length === 0) return undefined;
    return Knowledge.asTool(context);
  }
}

