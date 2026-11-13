import { Agent } from "@/layers/agent/harness";
import type { AgentRunResult, AgentExecutionOptions } from "@/layers/agent/types";
import type { AgentModule } from "@/core/spec";
import { AUM } from "@/core/aum";
import { ToolRegistry } from "@/layers/tools/registry";
import { EnvironmentResolver } from "@/layers/environment/sandbox";
import { Session } from "@/layers/integration/memory";

export * from "@/core/spec";
export * from "@/core/aum";

/**
 * Core Orchestration Module (OM)
 * 
 * "Where a Class is an Agent"
 * 
 * 1 Class = 5 Properties (`L · I · A · T · E`) = 1:1 identical to agent.json
 */
export class liate {
  // 1. Shorthand: L · I · A · T · E
  public L?: any;
  public I?: any;
  public A?: any;
  public T?: any;
  public E?: Record<string, string | undefined>;

  // 2. Full Name: LLM · Integration · Agent · Tools · Environment
  public LLM?: any;
  public Integration?: any;
  public Agent?: any;
  public Tools?: any;
  public Environment?: Record<string, string | undefined>;

  // 3. Lowercase: llm · integration · agent · tools · environment
  public llm?: any;
  public integration?: any;
  public agent?: any;
  public tools?: any;
  public environment?: Record<string, string | undefined>;

  private _runner?: Agent;

  /**
   * Initializes and returns the underlying Agent harness instance
   */
  public async getRunner(): Promise<Agent> {
    if (!this._runner) {
      const module = this.toModule();
      EnvironmentResolver.loadEnv();
      const resolvedEnv = EnvironmentResolver.resolve(module.E || {});

      const memory = new Session(module.I?.memory || "ephemeral");
      const tools = await ToolRegistry.resolveTools(module.T || [], resolvedEnv);

      const agentName = typeof module.A === "object" ? module.A.name : (module.A || this.constructor.name);
      const agentIntent = typeof module.A === "object" ? module.A.intent : undefined;
      const maxSteps = typeof module.A === "object" ? module.A.maxSteps : 10;
      const skills = typeof module.A === "object" && Array.isArray(module.A.skills) ? module.A.skills : undefined;
      const model = typeof module.L === "string" ? module.L : (module.L?.model || "sarvam/sarvam-105b-conversations");

      this._runner = new Agent({
        name: agentName,
        intent: agentIntent,
        model,
        maxSteps,
        skills,
        memory,
        tools
      });
    }
    return this._runner;
  }

  /**
   * Executes the agent on a user input via the autonomous ReAct reasoning loop
   */
  public async run(input: string, options?: AgentExecutionOptions): Promise<AgentRunResult> {
    const runner = await this.getRunner();
    return runner.run(input, options);
  }

  /**
   * Gracefully closes all background transports, child processes, and MCP connections
   */
  public async close(): Promise<void> {
    const { MCP } = await import("@/layers/tools/mcp");
    await MCP.closeAll();
  }

  /**
   * Instantiates an agent directly from an Agent Unified Module (AUM) or agent.json object
   */
  public static from(spec: any): liate {
    const instance = new liate();
    const parsed = AUM.parse(spec);
    instance.L = parsed.L;
    instance.I = parsed.I;
    instance.A = parsed.A;
    instance.T = parsed.T;
    instance.E = parsed.E;
    return instance;
  }

  /**
   * Loads an agent directly from an agent.json file path
   */
  public static async load(filePath: string): Promise<liate> {
    const fs = await import("fs/promises");
    const path = await import("path");
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    const raw = await fs.readFile(resolvedPath, "utf-8");
    const json = JSON.parse(raw);
    return liate.from(json);
  }

  /**
   * Exports the declarative L·I·A·T·E Agent Unified Module (AUM) representation
   */
  public toModule(): AgentModule {
    const L = this.L ?? this.LLM ?? this.llm;
    const I = this.I ?? this.Integration ?? this.integration;
    const A = this.A ?? this.Agent ?? this.agent ?? { name: this.constructor.name };
    const T = this.T ?? this.Tools ?? this.tools ?? [];
    const E = this.E ?? this.Environment ?? this.environment ?? {};

    return AUM.parse({ L, I, A, T, E });
  }
}

// Clean alias
export const Liate = liate;

