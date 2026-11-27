import type {
  AgentTool,
  AgentContext,
  AgentStep,
  AgentRunResult,
  AgentExecutionOptions,
  ToolCall,
  ToolResult
} from "@/layers/agent/types";
import type { MemoryProvider } from "@/layers/integration/types";
import type { LlmMessage, LlmChatResponse } from "@/layers/llm/model";
import { EnvironmentResolver } from "@/layers/environment/resolver";
import {
  CheckpointStore,
  defaultCheckpointStore,
  type ApprovalDecision
} from "@/layers/agent/checkpoint/store";
import { StructuredOutputResolver } from "@/layers/agent/schema/structured";

export interface LLMFunctionCaller {
  chat(messages: LlmMessage[], options?: any): Promise<LlmChatResponse & { toolCalls?: ToolCall[] }>;
}

function needsApproval(toolCalls: ToolCall[], rule?: boolean | string[]): boolean {
  if (!rule) return false;
  if (rule === true) return toolCalls.length > 0;
  if (Array.isArray(rule)) {
    const gated = new Set(rule.map((r) => r.trim().toLowerCase()));
    return toolCalls.some((tc) => gated.has(tc.name.toLowerCase()));
  }
  return false;
}

function toLlmMessages(memory: MemoryProvider): LlmMessage[] {
  return memory.getMessages().map((m) => {
    const item: LlmMessage = {
      role: m.role as "system" | "user" | "assistant" | "tool",
      content: m.content
    };
    if (m.name) item.name = m.name;
    if (m.toolCallId) item.tool_call_id = m.toolCallId;
    if (m.toolCalls && m.toolCalls.length > 0) {
      item.tool_calls = m.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments)
        }
      }));
    }
    return item;
  });
}

async function runToolBatch(
  toolCalls: ToolCall[],
  toolMap: Map<string, AgentTool>,
  memory: MemoryProvider,
  context: AgentContext,
  options: AgentExecutionOptions
): Promise<ToolResult[]> {
  const stepResults: ToolResult[] = [];

  for (const tc of toolCalls) {
    const tool = toolMap.get(tc.name);
    let resultStr: string;

    if (!tool) {
      resultStr = `Error: Tool '${tc.name}' not found. Available: ${Array.from(toolMap.keys()).join(", ")}`;
    } else {
      try {
        const res = options.sandboxTimeoutMs && options.sandboxTimeoutMs > 0
          ? await EnvironmentResolver.runWithTimeout(
              () => tool.execute(tc.arguments, context),
              options.sandboxTimeoutMs,
              `Tool '${tc.name}'`
            )
          : await tool.execute(tc.arguments, context);
        resultStr = typeof res === "string" ? res : JSON.stringify(res);
      } catch (err: any) {
        resultStr = `Error executing tool '${tc.name}': ${err.message}`;
      }
    }

    stepResults.push({
      toolCallId: tc.id,
      toolName: tc.name,
      result: resultStr
    });

    await memory.append({
      role: "tool",
      name: tc.name,
      toolCallId: tc.id,
      content: resultStr,
      timestamp: Date.now()
    });
  }

  return stepResults;
}

/**
 * Layer [A] Autonomous ReAct Reasoning Loop
 * Orchestrates: User Query -> Reason -> Tool Action / HITL Gate -> Observation -> Structured Final Answer
 */
export class ReActLoop {
  private static async continueLoop(
    llm: LLMFunctionCaller,
    memory: MemoryProvider,
    tools: AgentTool[],
    context: AgentContext,
    options: AgentExecutionOptions,
    state: {
      startTime: number;
      currentStep: number;
      maxSteps: number;
      steps: AgentStep[];
      systemInstruction: string;
      usedModel: string;
    }
  ): Promise<AgentRunResult> {
    const toolMap = new Map<string, AgentTool>(tools.map((t) => [t.name, t]));
    const formattedTools = tools.length > 0 ? tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: "object", properties: {} }
      }
    })) : undefined;

    const store: CheckpointStore = (options.checkpointStore as CheckpointStore) || defaultCheckpointStore;
    let { currentStep, maxSteps, steps, systemInstruction, usedModel } = state;
    const { startTime } = state;

    let finalOutput = "";
    let finalData: any = undefined;
    let finalThought: string | undefined = undefined;
    let finalAudioBase64: string | undefined = undefined;
    let finishReason: AgentRunResult["finishReason"] = "max_steps_reached";

    while (currentStep <= maxSteps) {
      const stepStartTime = Date.now();
      const conversationHistory = toLlmMessages(memory);
      const messages: LlmMessage[] = [
        { role: "system", content: systemInstruction },
        ...conversationHistory
      ];

      const {
        outputSchema: _os,
        requireApproval: _ra,
        checkpointStore: _cs,
        sandboxTimeoutMs: _st,
        onStep: _ost,
        modelTag: _mt,
        subAgent: _sa,
        context: _ctx,
        skills: _sk,
        tools: _tl,
        maxSteps: _ms,
        systemPrompt: _sp,
        ...llmExtraOptions
      } = options as any;

      const response = await llm.chat(messages, {
        ...llmExtraOptions,
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature ?? 0.2,
        tools: formattedTools,
        apiKey: options.apiKey,
        stream: options.stream ?? Boolean(options.onToken || options.onReasoningToken),
        onToken: options.onToken,
        onReasoningToken: options.onReasoningToken
      });

      usedModel = response.model || usedModel;
      if (response.audioBase64) finalAudioBase64 = response.audioBase64;
      const thought = response.reasoningContent;
      if (thought) finalThought = thought;

      const requestedToolCalls: ToolCall[] = response.toolCalls || [];

      if (requestedToolCalls.length > 0) {
        await memory.append({
          role: "assistant",
          content: response.text || "",
          reasoningContent: thought,
          toolCalls: requestedToolCalls,
          timestamp: stepStartTime
        });

        // HITL Gate: pause and persist checkpoint before executing gated tools
        if (needsApproval(requestedToolCalls, options.requireApproval)) {
          const checkpointId = store.createId();
          const nowIso = new Date().toISOString();
          store.save({
            checkpointId,
            agentName: context.agentName,
            sessionId: context.sessionId,
            step: currentStep,
            maxSteps,
            model: usedModel,
            systemInstruction,
            messages: memory.getMessages(),
            steps: [...steps],
            pendingToolCalls: requestedToolCalls,
            status: "paused",
            createdAt: nowIso,
            updatedAt: nowIso
          });

          return {
            text: `Paused at step ${currentStep} awaiting human approval for tool(s): ${requestedToolCalls.map((t) => t.name).join(", ")}`,
            thought: finalThought,
            steps,
            totalSteps: steps.length,
            model: usedModel,
            durationMs: Date.now() - startTime,
            finishReason: "paused_for_approval",
            audioBase64: finalAudioBase64,
            checkpointId,
            pendingApproval: {
              checkpointId,
              step: currentStep,
              toolCalls: requestedToolCalls
            }
          };
        }

        const stepResults = await runToolBatch(requestedToolCalls, toolMap, memory, context, options);

        const stepObj: AgentStep = {
          step: currentStep,
          thought,
          toolCalls: requestedToolCalls,
          toolResults: stepResults,
          timestamp: stepStartTime
        };
        steps.push(stepObj);
        options.onStep?.(stepObj);

        currentStep++;
      } else {
        finalOutput = response.text;
        finishReason = "stop";

        // Enforce Typed Structured Output if options.outputSchema is configured
        if (options.outputSchema) {
          let validation = StructuredOutputResolver.validate(finalOutput, options.outputSchema);
          if (!validation.success) {
            const repairMsg = StructuredOutputResolver.buildRepairMessage(finalOutput, validation.error);
            const repairResp = await llm.chat([...messages, { role: "assistant", content: finalOutput }, repairMsg], {
              ...llmExtraOptions,
              model: options.model,
              maxTokens: options.maxTokens,
              temperature: 0,
              apiKey: options.apiKey,
              stream: false
            });
            finalOutput = repairResp.text;
            validation = StructuredOutputResolver.validate(finalOutput, options.outputSchema);
          }

          if (validation.success) {
            finalData = validation.data;
            finalOutput = validation.normalizedText;
          } else {
            finishReason = "error";
            finalOutput = `Structured output validation failed: ${validation.error}`;
          }
        }

        const stepObj: AgentStep = {
          step: currentStep,
          thought,
          output: finalOutput,
          timestamp: stepStartTime
        };
        steps.push(stepObj);
        options.onStep?.(stepObj);

        await memory.append({
          role: "assistant",
          content: finalOutput,
          reasoningContent: thought,
          timestamp: Date.now()
        });

        break;
      }
    }

    return {
      text: finalOutput,
      data: finalData,
      thought: finalThought,
      steps,
      totalSteps: steps.length,
      model: usedModel,
      durationMs: Date.now() - startTime,
      finishReason,
      audioBase64: finalAudioBase64
    };
  }

  public static async execute(
    userInput: string,
    llm: LLMFunctionCaller,
    memory: MemoryProvider,
    tools: AgentTool[] = [],
    context: AgentContext,
    options: AgentExecutionOptions = {}
  ): Promise<AgentRunResult> {
    const startTime = Date.now();
    const maxSteps = options.maxSteps ?? 10;

    await memory.append({
      role: "user",
      content: userInput,
      timestamp: startTime
    });

    const baseInstruction = options.systemPrompt ??
      `You are ${context.agentName}.
Your intent: ${context.intent || "Autonomous AI Agent"}.
Follow the ReAct methodology: Reason carefully, invoke tools when needed, observe results, and provide a clear final answer.`;

    const systemInstruction = options.outputSchema
      ? baseInstruction + StructuredOutputResolver.buildInstruction(options.outputSchema)
      : baseInstruction;

    return this.continueLoop(llm, memory, tools, context, options, {
      startTime,
      currentStep: 1,
      maxSteps,
      steps: [],
      systemInstruction,
      usedModel: options.model || "unknown"
    });
  }

  /**
   * Resumes a paused HITL checkpoint after human approval or rejection.
   */
  public static async resume(
    checkpointId: string,
    decision: ApprovalDecision,
    llm: LLMFunctionCaller,
    memory: MemoryProvider,
    tools: AgentTool[] = [],
    context: AgentContext,
    options: AgentExecutionOptions = {}
  ): Promise<AgentRunResult> {
    const startTime = Date.now();
    const store: CheckpointStore = (options.checkpointStore as CheckpointStore) || defaultCheckpointStore;
    const snap = store.get(checkpointId);
    if (!snap) {
      throw new Error(`[Liate HITL]: Checkpoint '${checkpointId}' not found.`);
    }
    if (snap.status !== "paused") {
      throw new Error(`[Liate HITL]: Checkpoint '${checkpointId}' is already '${snap.status}'.`);
    }

    const toolMap = new Map<string, AgentTool>(tools.map((t) => [t.name, t]));
    const steps = [...snap.steps];

    // Ensure session memory matches the checkpoint snapshot
    if (memory.getMessages().length === 0 && snap.messages.length > 0) {
      for (const m of snap.messages) {
        await memory.append(m);
      }
    }

    let stepResults: ToolResult[];
    if (decision.approved) {
      const resolvedCalls = snap.pendingToolCalls.map((tc) => ({
        ...tc,
        arguments: decision.updatedArgs?.[tc.id] ?? decision.updatedArgs?.[tc.name] ?? tc.arguments
      }));
      stepResults = await runToolBatch(resolvedCalls, toolMap, memory, context, options);
    } else {
      const rejectMsg = `Human rejected tool execution${decision.reason ? `: ${decision.reason}` : "."}`;
      stepResults = [];
      for (const tc of snap.pendingToolCalls) {
        stepResults.push({ toolCallId: tc.id, toolName: tc.name, result: rejectMsg });
        await memory.append({
          role: "tool",
          name: tc.name,
          toolCallId: tc.id,
          content: rejectMsg,
          timestamp: Date.now()
        });
      }
    }

    const resumedStep: AgentStep = {
      step: snap.step,
      toolCalls: snap.pendingToolCalls,
      toolResults: stepResults,
      timestamp: Date.now()
    };
    steps.push(resumedStep);
    options.onStep?.(resumedStep);

    store.save({
      ...snap,
      status: decision.approved ? "completed" : "rejected",
      messages: memory.getMessages(),
      steps
    });

    // Continue without re-gating the already-approved step unless requireApproval stays active for subsequent steps
    return this.continueLoop(llm, memory, tools, context, options, {
      startTime,
      currentStep: snap.step + 1,
      maxSteps: options.maxSteps ?? snap.maxSteps,
      steps,
      systemInstruction: snap.systemInstruction,
      usedModel: options.model || snap.model
    });
  }
}
