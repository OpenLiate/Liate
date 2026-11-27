import { Agent } from "@/layers/agent/harness/agent";
import type { AgentRunResult, AgentExecutionOptions } from "@/layers/agent/types";
import type { AgentModule } from "@/core/spec";
import { isMultiModelMap } from "@/core/spec";
import { AUM } from "@/core/aum";
import { ToolRegistry } from "@/layers/tools/registry/resolver";
import { EnvironmentResolver } from "@/layers/environment/resolver";
import { IntegrationResolver } from "@/layers/integration/resolver";

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

      const memory = IntegrationResolver.resolveMemory(module.I as any);
      const integrationTools = await IntegrationResolver.resolveIntegrationTools(module.I as any, resolvedEnv);
      const mcpTools = await ToolRegistry.resolveTools(module.T || [], resolvedEnv);
      const tools = [...integrationTools, ...mcpTools];

      const agentName = typeof module.A === "object" ? module.A.name : (module.A || this.constructor.name);
      const agentVersion = typeof module.A === "object" ? (module.A.version || "0.0.1") : "0.0.1";
      const agentIntent = typeof module.A === "object" ? module.A.intent : undefined;
      const maxSteps = typeof module.A === "object" ? module.A.maxSteps : 10;
      const skills = typeof module.A === "object" && Array.isArray(module.A.skills) ? module.A.skills : undefined;
      const subAgents = typeof module.A === "object" && Array.isArray(module.A.subAgents) ? module.A.subAgents : undefined;

      // MultiModelMap — no model extraction needed; pass raw layerL
      const rawL = module.L;
      if (!rawL) {
        throw new Error("[Liate Error]: Missing required Layer [L] model definition. OpenLiate never hardcodes silent model defaults.");
      }

      // For single-model: extract model string; for multi-model: pass layerL through
      const isMM = isMultiModelMap(rawL as any);
      const modelStr = isMM
        ? undefined
        : (typeof rawL === "string" ? rawL : rawL?.model);

      if (!isMM && !modelStr) {
        throw new Error("[Liate Error]: Missing required Layer [L] model definition. OpenLiate never hardcodes silent model defaults.");
      }

      const modelExtra = typeof rawL === "object" && !isMM
        ? (({ model: _m, ...rest }) => rest)(rawL as any)
        : {};

      this._runner = new Agent({
        name: agentName,
        version: agentVersion,
        intent: agentIntent,
        model: modelStr,
        layerL: rawL,
        maxSteps,
        skills,
        memory,
        tools,
        subAgents,
        context: module.I?.context,
        requireApproval: (module.A as any)?.requireApproval,
        outputSchema: (module.A as any)?.outputSchema,
        durable: (module.A as any)?.durable,
        workflow: (module.A as any)?.workflow,
        schedule: (module.A as any)?.schedule,
        ...modelExtra
      } as any);
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
   * Resumes a paused HITL checkpoint after human approval or rejection
   */
  public async resume(
    checkpointId: string,
    decision: { approved: boolean; reason?: string; updatedArgs?: Record<string, Record<string, any>> },
    options?: AgentExecutionOptions
  ): Promise<AgentRunResult> {
    const runner = await this.getRunner();
    return runner.resume(checkpointId, decision, options);
  }

  /**
   * Executes Layer [A].workflow steps with optional SQLite durability
   */
  public async runWorkflow(input: string, options?: AgentExecutionOptions) {
    const runner = await this.getRunner();
    return runner.runWorkflow(input, options);
  }

  /**
   * Resumes a durable workflow run from its last persisted step
   */
  public async resumeWorkflow(runId: string, options?: AgentExecutionOptions) {
    const runner = await this.getRunner();
    return runner.resumeWorkflow(runId, options);
  }

  /**
   * Registers Layer [A].schedule on a CronScheduler backed by DurableRunStore
   */
  public async createScheduler(storePath?: string | boolean) {
    const runner = await this.getRunner();
    const schedule = runner.getSchedule();
    if (!schedule) {
      throw new Error(`[Liate Cron Error]: Agent '${runner.name}' has no Layer [A].schedule defined.`);
    }
    const { CronScheduler } = await import("@/runtime/cron");
    const { DurableRunStore } = await import("@/layers/agent/checkpoint/durable");
    const store = storePath ? new DurableRunStore(storePath) : (runner.getDurableStore() || new DurableRunStore());
    const scheduler = new CronScheduler(store);
    await scheduler.register(runner.name, schedule, (prompt) => runner.run(prompt));
    return scheduler;
  }

  /**
   * Gracefully closes all background transports, child processes, and MCP connections
   */
  public async close(): Promise<void> {
    const { MCP } = await import("@/layers/tools/mcp/client");
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
   * Loads an agent directly from an agent.json file path or hub agent name
   */
  public static async load(filePath: string): Promise<liate> {
    const fs = await import("fs/promises");
    const { existsSync } = await import("fs");
    const path = await import("path");
    
    let resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    
    if (!existsSync(resolvedPath)) {
      // Check if it's a directory containing agent.json
      if (existsSync(path.join(resolvedPath, "agent.json"))) {
        resolvedPath = path.join(resolvedPath, "agent.json");
      } else {
        // Check in hub/agents
        const hubCandidate = path.resolve(process.cwd(), "hub", "agents", filePath, "agent.json");
        if (existsSync(hubCandidate)) {
          resolvedPath = hubCandidate;
        }
      }
    } else {
      // If path exists and is a directory, look for agent.json inside
      const stat = await fs.stat(resolvedPath);
      if (stat.isDirectory()) {
        const nested = path.join(resolvedPath, "agent.json");
        if (existsSync(nested)) {
          resolvedPath = nested;
        }
      }
    }

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

