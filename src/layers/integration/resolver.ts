import type { AgentTool, IntegrationConfig, KnowledgeContext, MemoryProvider } from "@/layers/integration/types";
import { Session } from "@/layers/integration/memory/session";
import { Knowledge } from "@/layers/integration/knowledge/manager";
import { Lib } from "@/layers/integration/lib/loader";
import { ContextManager } from "@/layers/integration/context/context";
import { resolveConnectorTools } from "@/layers/integration/connectors/registry";

/**
 * Universal Integration Resolver for Layer [I]
 * Unifies memory adapters, knowledge sources, dynamic libs, direct APIs, and webhooks.
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
    if (!context || (context.documents.length === 0 && !context.vectorConfig)) return undefined;
    return Knowledge.asTool(context);
  }

  /**
   * Formats Layer [I].context (string or structured object) into a prompt-ready <context> block.
   */
  public static formatContextBlock(context?: string | Record<string, any>): string {
    return ContextManager.format(context);
  }

  /**
   * Resolves all tool-producing integrations declared in Layer [I]:
   * knowledge search, dynamic libs, direct REST APIs, and outbound webhooks.
   */
  public static async resolveIntegrationTools(
    config?: IntegrationConfig,
    env?: Record<string, string | undefined>,
    baseDir?: string
  ): Promise<AgentTool[]> {
    if (!config || typeof config !== "object") return [];
    const tools: AgentTool[] = [];

    const knowledgeTool = await this.resolveKnowledgeTool(config, baseDir);
    if (knowledgeTool) {
      tools.push(knowledgeTool);
    }

    if (config.libs) {
      const loadedLibs = await Lib.resolveLibs(config.libs);
      tools.push(...Lib.asTools(loadedLibs));
    }

    tools.push(...resolveConnectorTools(config, env));
    return tools;
  }
}
