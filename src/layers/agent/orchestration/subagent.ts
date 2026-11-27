import type {
  AgentContext,
  AgentExecutionOptions,
  AgentRunResult,
  AgentTool,
  SubAgentSpec
} from "@/layers/agent/types";
import { ReActLoop } from "@/layers/agent/loop/react";
import { SkillResolver } from "@/layers/agent/skills/resolver";
import { A2AClient } from "@/layers/agent/a2a/client";
import { Session } from "@/layers/integration/memory/session";
import { LLMRouter } from "@/layers/llm/model";

export interface SubAgentExecutionContext {
  parentName: string;
  parentIntent: string;
  parentVersion: string;
  defaultMaxSteps: number;
  tools: AgentTool[];
  resolveModel: (modelTag?: string) => string;
  apiKey?: string;
  extraOptions?: Record<string, any>;
}

/**
 * Layer [A] Sub-Agent Orchestrator
 * Executes sub-agents declared in A.subAgents in isolated ephemeral sessions
 * and exposes them as native AgentTools (`subagent_<name>`) for ReAct loops.
 */
export class SubAgentRunner {
  public static async execute(
    spec: SubAgentSpec,
    task: string,
    ctx: SubAgentExecutionContext,
    options?: AgentExecutionOptions
  ): Promise<AgentRunResult> {
    if (spec.a2aUrl) {
      const start = Date.now();
      const client = new A2AClient(spec.a2aUrl);
      const taskResult = await client.sendMessage(task, { sessionId: `a2a_${ctx.parentName}_${spec.name}` });
      const textParts = taskResult.status?.message?.parts
        ?.filter((p) => p.kind === "text")
        .map((p) => p.text)
        .join("\n") ||
        taskResult.artifacts?.[0]?.parts
          ?.filter((p): p is { kind: "text"; text: string } => p.kind === "text")
          .map((p) => p.text)
          .join("\n") ||
        "";

      return {
        text: textParts,
        steps: [{ step: 1, output: textParts, timestamp: Date.now() }],
        totalSteps: 1,
        model: `a2a:${spec.a2aUrl}`,
        agentVersion: ctx.parentVersion,
        durationMs: Date.now() - start,
        finishReason: taskResult.status?.state === "input-required" ? "paused_for_approval" : "stop"
      };
    }

    const skillSlugs = spec.skills && spec.skills.length > 0 ? spec.skills : [];
    const resolvedSkills = skillSlugs.length > 0 ? await SkillResolver.resolveAll(skillSlugs) : [];
    const skillPromptBlock = SkillResolver.formatSystemPrompt(resolvedSkills);

    const subMemory = new Session(":memory:", {
      parentAgent: ctx.parentName,
      subAgent: spec.name
    });

    const subContext: AgentContext = {
      agentName: spec.name,
      intent: (spec.intent || ctx.parentIntent) + skillPromptBlock,
      sessionId: subMemory.sessionId,
      state: {
        parentAgent: ctx.parentName,
        subAgent: spec.name,
        skills: resolvedSkills.map((s) => s.slug)
      }
    };

    const activeModel = options?.model || ctx.resolveModel(options?.modelTag ?? spec.modelTag);

    // Sub-agents inherit parent non-subagent tools to avoid infinite self-recursion
    const safeTools = ctx.tools.filter((t) => !t.name.startsWith("subagent_"));

    const result = await ReActLoop.execute(
      task,
      LLMRouter,
      subMemory,
      safeTools,
      subContext,
      {
        ...(ctx.extraOptions || {}),
        ...(options || {}),
        model: activeModel,
        maxSteps: options?.maxSteps ?? spec.maxSteps ?? ctx.defaultMaxSteps,
        apiKey: options?.apiKey || ctx.apiKey,
        systemPrompt: spec.intent
          ? `You are ${spec.name}, a specialized sub-agent of ${ctx.parentName}.\nYour intent: ${spec.intent}${skillPromptBlock}\nComplete the assigned task concisely and accurately.`
          : undefined
      }
    );

    return {
      ...result,
      agentVersion: ctx.parentVersion
    };
  }

  /**
   * Builds callable `subagent_<name>` AgentTools for each entry in Layer [A].subAgents.
   */
  public static buildTools(
    specs: SubAgentSpec[],
    ctx: SubAgentExecutionContext
  ): AgentTool[] {
    return specs.map((spec) => {
      const safeName = `subagent_${spec.name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
      return {
        name: safeName,
        description: `Delegate a task to sub-agent '${spec.name}'. Intent: ${spec.intent || "Specialized sub-agent"}`,
        parameters: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: `Clear task or question for sub-agent '${spec.name}'.`
            }
          },
          required: ["task"]
        },
        execute: async (args) => {
          const task = String(args.task || "");
          const res = await SubAgentRunner.execute(spec, task, ctx);
          return res.text;
        }
      };
    });
  }
}
