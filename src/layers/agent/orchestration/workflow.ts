import type { WorkflowStepSpec } from "@/core/spec";
import type {
  AgentExecutionOptions,
  AgentRunResult,
  AgentStep,
  AgentTool
} from "@/layers/agent/types";
import { DurableRunStore, type DurableRunRecord } from "@/layers/agent/checkpoint/durable";

export interface WorkflowExecutionContext {
  agentName: string;
  agentVersion: string;
  tools: AgentTool[];
  runAgent: (prompt: string, options?: AgentExecutionOptions) => Promise<AgentRunResult>;
  runSubAgent: (name: string, prompt: string, options?: AgentExecutionOptions) => Promise<AgentRunResult>;
  durableStore?: DurableRunStore;
}

export interface WorkflowRunResult extends AgentRunResult {
  runId?: string;
  stepOutputs: Record<string, { text: string; data?: any }>;
}

interface WorkflowState {
  input: string;
  prev: string;
  steps: Record<string, { text: string; data?: any }>;
  agentSteps: AgentStep[];
  modelUsed: string;
}

function interpolateTemplate(template: string, state: WorkflowState): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, exprRaw) => {
    const expr = String(exprRaw).trim();
    if (expr === "input") return state.input;
    if (expr === "prev") return state.prev;
    if (expr.startsWith("steps.")) {
      const parts = expr.split(".");
      const stepId = parts[1];
      const field = parts[2] || "text";
      const entry = state.steps[stepId];
      if (!entry) return "";
      const val = field === "data" ? entry.data : entry.text;
      return typeof val === "string" ? val : JSON.stringify(val ?? "");
    }
    return "";
  });
}

function resolveArgs(
  args: Record<string, unknown> | undefined,
  state: WorkflowState
): Record<string, any> {
  if (!args) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === "string") {
      out[k] = interpolateTemplate(v, state);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = resolveArgs(v as Record<string, unknown>, state);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function withRetries<T>(retries: number, fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const delayMs = Math.min(250 * 2 ** attempt, 2000);
      await new Promise((r) => setTimeout(r, delayMs));
      attempt++;
    }
  }
  throw lastErr;
}

/**
 * Layer [A] Deterministic & Durable Workflow Runner.
 * Composes agent, subagent, tool, parallel, branch, and sleep steps with optional SQLite durability.
 */
export class WorkflowRunner {
  public static async execute(
    steps: WorkflowStepSpec[],
    input: string,
    ctx: WorkflowExecutionContext,
    options?: AgentExecutionOptions & { durable?: boolean; runId?: string }
  ): Promise<WorkflowRunResult> {
    const startTime = Date.now();
    const isDurable = Boolean(options?.durable || ctx.durableStore);
    const store = isDurable ? (ctx.durableStore || new DurableRunStore()) : undefined;

    let runRecord: DurableRunRecord | undefined;
    const state: WorkflowState = {
      input,
      prev: input,
      steps: {},
      agentSteps: [],
      modelUsed: options?.model || "workflow"
    };

    if (store) {
      if (options?.runId) {
        const existing = await store.getRun(options.runId);
        if (existing) {
          runRecord = await store.updateRunStatus(existing.runId, "running");
          for (const [stepId, rec] of Object.entries(existing.stepOutputs)) {
            state.steps[stepId] = { text: rec.output, data: rec.data };
            state.prev = rec.output;
          }
        }
      }
      if (!runRecord) {
        runRecord = await store.createRun(ctx.agentName, input, options?.runId);
      }
    }

    try {
      await this.runSequence(steps, state, ctx, options, store, runRecord?.runId, "");

      if (store && runRecord) {
        await store.updateRunStatus(runRecord.runId, "completed", {
          finalOutput: state.prev
        });
      }

      return {
        text: state.prev,
        steps: state.agentSteps,
        totalSteps: state.agentSteps.length,
        model: state.modelUsed,
        agentVersion: ctx.agentVersion,
        durationMs: Date.now() - startTime,
        finishReason: "stop",
        runId: runRecord?.runId,
        stepOutputs: state.steps
      };
    } catch (err: any) {
      if (store && runRecord) {
        await store.updateRunStatus(runRecord.runId, "failed", {
          error: err?.message || String(err)
        });
      }
      throw err;
    }
  }

  private static async runSequence(
    steps: WorkflowStepSpec[],
    state: WorkflowState,
    ctx: WorkflowExecutionContext,
    options: AgentExecutionOptions | undefined,
    store: DurableRunStore | undefined,
    runId: string | undefined,
    prefix: string
  ): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = step.id || `${prefix}step_${i}`;
      const stepType = step.type || (step.subAgent ? "subagent" : step.tool ? "tool" : "agent");

      // Idempotent replay: skip already checkpointed steps on durable resume
      if (state.steps[stepId]) {
        state.prev = state.steps[stepId].text;
        continue;
      }

      const retries = Math.max(0, step.retries ?? 0);
      const result = await withRetries(retries, async () =>
        this.executeSingleStep(step, stepId, stepType, state, ctx, options, store, runId)
      );

      state.steps[stepId] = result;
      state.prev = result.text;

      const agentStep: AgentStep = {
        step: state.agentSteps.length + 1,
        thought: `Workflow step '${stepId}' (${stepType})`,
        output: result.text,
        timestamp: Date.now()
      };
      state.agentSteps.push(agentStep);
      options?.onStep?.(agentStep);

      if (store && runId) {
        await store.saveStepResult(runId, i, {
          stepId,
          type: stepType,
          output: result.text,
          data: result.data,
          completedAt: new Date().toISOString()
        });
      }
    }
  }

  private static async executeSingleStep(
    step: WorkflowStepSpec,
    stepId: string,
    stepType: string,
    state: WorkflowState,
    ctx: WorkflowExecutionContext,
    options: AgentExecutionOptions | undefined,
    store: DurableRunStore | undefined,
    runId: string | undefined
  ): Promise<{ text: string; data?: any }> {
    const prompt = step.prompt ? interpolateTemplate(step.prompt, state) : state.prev;

    if (stepType === "sleep") {
      const ms = Math.max(0, step.sleepMs ?? 0);
      if (ms > 0) {
        await new Promise((r) => setTimeout(r, ms));
      }
      return { text: state.prev, data: { sleptMs: ms } };
    }

    if (stepType === "tool") {
      if (!step.tool) {
        throw new Error(`[Liate Workflow Error]: Step '${stepId}' has type 'tool' without 'tool' name.`);
      }
      const tool = ctx.tools.find((t) => t.name === step.tool);
      if (!tool) {
        throw new Error(`[Liate Workflow Error]: Tool '${step.tool}' not found in Layer [T].`);
      }
      const resolvedArgs = resolveArgs(step.args, state);
      const raw = await tool.execute(resolvedArgs, {
        agentName: ctx.agentName,
        intent: `Workflow step ${stepId}`,
        state: state.steps
      });
      const text = typeof raw === "string" ? raw : JSON.stringify(raw);
      return { text, data: raw };
    }

    if (stepType === "subagent") {
      if (!step.subAgent) {
        throw new Error(`[Liate Workflow Error]: Step '${stepId}' has type 'subagent' without 'subAgent'.`);
      }
      const res = await ctx.runSubAgent(step.subAgent, prompt, {
        ...options,
        modelTag: step.modelTag ?? options?.modelTag,
        bypassWorkflow: true
      });
      state.modelUsed = res.model;
      return { text: res.text, data: res.data };
    }

    if (stepType === "parallel") {
      const branches = step.steps || [];
      const results = await Promise.all(
        branches.map((branch, idx) => {
          const branchId = branch.id || `${stepId}_b${idx}`;
          const branchType = branch.type || (branch.subAgent ? "subagent" : branch.tool ? "tool" : "agent");
          return withRetries(Math.max(0, branch.retries ?? 0), () =>
            this.executeSingleStep(branch, branchId, branchType, state, ctx, options, store, runId)
          );
        })
      );
      const combined: Record<string, any> = {};
      branches.forEach((b, idx) => {
        const key = b.id || `branch_${idx}`;
        combined[key] = results[idx].text;
      });
      return { text: JSON.stringify(combined), data: combined };
    }

    if (stepType === "branch") {
      let branchKey = "default";
      if (typeof step.condition === "function") {
        const outcome = await step.condition({
          input: state.input,
          prev: state.prev,
          steps: state.steps
        });
        branchKey = typeof outcome === "boolean" ? (outcome ? "true" : "false") : String(outcome);
      } else if (typeof step.condition === "string") {
        const evaluated = interpolateTemplate(step.condition, state).trim();
        branchKey = evaluated || "default";
      }

      const targetSteps = step.cases?.[branchKey] ?? step.defaultCase ?? [];
      if (targetSteps.length === 0) {
        return { text: state.prev, data: { branch: branchKey } };
      }
      await this.runSequence(targetSteps, state, ctx, options, store, runId, `${stepId}_${branchKey}_`);
      return { text: state.prev, data: { branch: branchKey } };
    }

    // Default: "agent" step (runs the parent agent ReAct loop directly)
    const res = await ctx.runAgent(prompt, {
      ...options,
      modelTag: step.modelTag ?? options?.modelTag,
      bypassWorkflow: true
    });
    state.modelUsed = res.model;
    return { text: res.text, data: res.data };
  }
}
