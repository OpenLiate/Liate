import { ReActLoop } from "@/layers/agent/loop";
import { SkillResolver } from "@/layers/agent/skills";
import type {
  AgentTool,
  AgentContext,
  AgentRunResult,
  AgentExecutionOptions,
  AgentConfig
} from "@/layers/agent/types";
import type { MemoryProvider } from "@/layers/integration/types";
import { Session } from "@/layers/integration/memory";
import { LLMRouter } from "@/layers/llm/model";

export interface AgentOptions extends AgentConfig {
  memory?: MemoryProvider | string;
  apiKey?: string;
}

/**
 * Layer [A] Agent Harness
 * Jensen Huang's 3rd Element: The execution engine running the agent's autonomous ReAct loop.
 */
export class Agent {
  public readonly name: string;
  public readonly intent: string;
  public readonly model: string;
  public readonly maxSteps: number;
  public readonly skills: string[];
  private memory: MemoryProvider;
  private tools: Map<string, AgentTool> = new Map();
  private apiKey?: string;

  constructor(options: AgentOptions = { name: "agent" }) {
    this.name = options.name || "agent";
    this.intent = options.intent || "Autonomous AI Agent";
    this.model = options.model || "sarvam/sarvam-105b-conversations";
    this.maxSteps = options.maxSteps ?? 10;
    this.skills = options.skills || [];
    this.apiKey = options.apiKey;

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
  }

  /**
   * Registers a tool dynamically
   */
  public addTool(tool: AgentTool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * Executes the agent on a user prompt via the autonomous ReAct reasoning loop
   */
  public async run(
    prompt: string,
    options?: AgentExecutionOptions
  ): Promise<AgentRunResult> {
    const skillSlugs = [...new Set([...this.skills, ...(options?.skills || [])])];
    const resolvedSkills = skillSlugs.length > 0 ? await SkillResolver.resolveAll(skillSlugs) : [];
    const skillPromptBlock = SkillResolver.formatSystemPrompt(resolvedSkills);

    const context: AgentContext = {
      agentName: this.name,
      intent: this.intent + skillPromptBlock,
      sessionId: this.memory.sessionId,
      state: { skills: resolvedSkills.map((s) => s.slug) }
    };

    const combinedTools = [
      ...Array.from(this.tools.values()),
      ...(options?.tools || [])
    ];

    return ReActLoop.execute(
      prompt,
      LLMRouter,
      this.memory,
      combinedTools,
      context,
      {
        model: options?.model || this.model,
        maxSteps: options?.maxSteps ?? this.maxSteps,
        temperature: options?.temperature,
        systemPrompt: options?.systemPrompt
          ? options.systemPrompt + skillPromptBlock
          : undefined,
        apiKey: options?.apiKey || this.apiKey
      }
    );
  }

  public getMemory(): MemoryProvider {
    return this.memory;
  }
}

// Clean Aliases
export const Harness = Agent;
export const AgentHarness = Agent;

