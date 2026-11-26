import { ReActLoop } from "@/layers/agent/loop/react";
import { SkillResolver } from "@/layers/agent/skills/resolver";
import { SubAgentRunner } from "@/layers/agent/orchestration/subagent";
import type {
  AgentTool,
  AgentContext,
  AgentRunResult,
  AgentExecutionOptions,
  AgentConfig,
  SubAgentSpec
} from "@/layers/agent/types";
import type { MemoryProvider } from "@/layers/integration/types";
import { Session } from "@/layers/integration/memory/session";
import { ContextManager } from "@/layers/integration/context/context";
import { LLMRouter } from "@/layers/llm/model";
import { isMultiModelMap, resolveModelTag } from "@/core/spec";

export interface AgentOptions extends AgentConfig {
  memory?: MemoryProvider | string;
  apiKey?: string;
  /** Raw LayerL value — string | object | MultiModelMap */
  layerL?: any;
}

/**
 * Layer [A] Agent Harness
 * The execution engine running the agent's autonomous ReAct loop.
 *
 * Supports:
 *   - Multi-Model Layer [L] via modelTag
 *   - Dynamic skills injection
 *   - Agent version traceability via AgentRunResult.agentVersion
 */
export class Agent {
  public readonly name: string;
  public readonly version: string;
  public readonly intent: string;
  public readonly model: string;
  public readonly maxSteps: number;
  public readonly skills: string[];
  private memory: MemoryProvider;
  private tools: Map<string, AgentTool> = new Map();
  private apiKey?: string;
  private extraOptions: Record<string, any>;
  /** Raw LayerL — string | object | MultiModelMap */
  private layerL: any;
  /** Named sub-agents declared under Layer [A].subAgents */
  private subAgents: Map<string, SubAgentSpec> = new Map();
  /** Layer [I].context carried into runtime AgentContext */
  private baseContext?: string | Record<string, any>;

  constructor(options: AgentOptions = { name: "agent" }) {
    const rawL = options.layerL ?? options.model;
    if (!rawL) {
      throw new Error("[Liate Error]: Missing required Layer [L] model in Agent constructor. OpenLiate never hardcodes silent model defaults.");
    }

    this.layerL = rawL;
    this.name = options.name || "agent";
    this.version = options.version || "0.0.1";
    this.intent = options.intent || "Autonomous AI Agent";
    this.maxSteps = options.maxSteps ?? 10;
    this.skills = options.skills || [];
    this.apiKey = options.apiKey;
    const {
      layerL: _layerL,
      modelTag: _modelTag,
      name: _name,
      version: _version,
      intent: _intent,
      memory: _memory,
      tools: _tools,
      skills: _skills,
      maxSteps: _maxSteps,
      subAgents: _subAgents,
      context: _context,
      ...restOptions
    } = options as any;
    this.extraOptions = restOptions;
    this.baseContext = options.context;

    // Resolve the "default" model string for display / single-model paths
    if (isMultiModelMap(rawL)) {
      const resolved = resolveModelTag(rawL);
      this.model = typeof resolved === "string"
        ? resolved
        : `${(resolved as any).provider ?? ""}/${(resolved as any).model}`.replace(/^\//, "");
    } else {
      this.model = typeof rawL === "string"
        ? rawL
        : `${(rawL as any).provider ?? ""}/${(rawL as any).model}`.replace(/^\//, "");
    }

    // Resolve Layer [I] Session Memory
    if (!options.memory) {
      this.memory = new Session("ephemeral");
    } else if (typeof options.memory === "string") {
      this.memory = new Session(options.memory);
    } else {
      this.memory = options.memory;
    }

    if (options.tools) {
      for (const t of options.tools) {
        this.tools.set(t.name, t);
      }
    }

    if (options.subAgents) {
      for (const sa of options.subAgents) {
        this.subAgents.set(sa.name, sa);
      }
    }
  }

  /**
   * Registers a tool dynamically
   */
  public addTool(tool: AgentTool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * Resolves the active model string for this run.
   * If layerL is a MultiModelMap and modelTag is set, picks that tag.
   */
  private resolveModel(modelTag?: string): string {
    if (isMultiModelMap(this.layerL)) {
      const entry = resolveModelTag(this.layerL, modelTag);
      return typeof entry === "string"
        ? entry
        : `${(entry as any).provider ?? ""}/${(entry as any).model}`.replace(/^\//, "");
    }
    return this.model;
  }

  /**
   * Executes the agent on a user prompt via the autonomous ReAct reasoning loop.
   * options.modelTag — select a named model from a MultiModelMap L
   */
  public async run(
    prompt: string,
    options?: AgentExecutionOptions
  ): Promise<AgentRunResult> {
    const baseTools = [
      ...Array.from(this.tools.values()),
      ...(options?.tools || [])
    ];

    const subExecCtx = {
      parentName: this.name,
      parentIntent: this.intent,
      parentVersion: this.version,
      defaultMaxSteps: this.maxSteps,
      tools: baseTools,
      resolveModel: (tag?: string) => this.resolveModel(tag),
      apiKey: this.apiKey,
      extraOptions: this.extraOptions
    };

    if (options?.subAgent) {
      const spec = this.subAgents.get(options.subAgent);
      if (!spec) {
        const available = Array.from(this.subAgents.keys()).join(", ");
        throw new Error(
          `[Liate Error]: Sub-agent '${options.subAgent}' not found under Layer [A].subAgents. Available: ${available || "none"}`
        );
      }
      return SubAgentRunner.execute(spec, prompt, subExecCtx, options);
    }

    const skillSlugs = [...new Set([...this.skills, ...(options?.skills || [])])];
    const resolvedSkills = skillSlugs.length > 0 ? await SkillResolver.resolveAll(skillSlugs) : [];
    const skillPromptBlock = SkillResolver.formatSystemPrompt(resolvedSkills);

    const mergedContext = ContextManager.merge(this.baseContext, options?.context);
    const contextPromptBlock = ContextManager.format(mergedContext);

    const context: AgentContext = {
      agentName: this.name,
      intent: this.intent + contextPromptBlock + skillPromptBlock,
      sessionId: this.memory.sessionId,
      state: {
        skills: resolvedSkills.map((s) => s.slug),
        version: this.version,
        ...(mergedContext !== undefined ? { context: mergedContext } : {})
      }
    };

    const subAgentTools = this.subAgents.size > 0
      ? SubAgentRunner.buildTools(Array.from(this.subAgents.values()), subExecCtx)
      : [];

    const combinedTools = [...baseTools, ...subAgentTools];

    const activeModel = options?.model || this.resolveModel(options?.modelTag);

    const result = await ReActLoop.execute(
      prompt,
      LLMRouter,
      this.memory,
      combinedTools,
      context,
      {
        ...this.extraOptions,
        model: activeModel,
        maxSteps: options?.maxSteps ?? this.maxSteps,
        temperature: options?.temperature,
        systemPrompt: options?.systemPrompt
          ? options.systemPrompt + contextPromptBlock + skillPromptBlock
          : undefined,
        apiKey: options?.apiKey || this.apiKey,
        ...(options as any)
      }
    );

    return {
      ...result,
      agentVersion: this.version
    };
  }

  /**
   * Lists the tags available in a MultiModelMap Layer [L].
   * Returns [] when L is a single model.
   */
  public getModelTags(): string[] {
    if (isMultiModelMap(this.layerL)) {
      return Object.keys(this.layerL);
    }
    return [];
  }

  public getSubAgents(): string[] {
    return Array.from(this.subAgents.keys());
  }

  public getMemory(): MemoryProvider {
    return this.memory;
  }
}

// Clean Aliases
export const Harness = Agent;
export const AgentHarness = Agent;
