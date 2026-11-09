import type {
  AgentTool,
  AgentContext,
  AgentStep,
  AgentRunResult,
  AgentExecutionOptions,
  ToolCall,
  ToolResult
} from "./types";
import type { MemoryProvider } from "../integration/types";
import type { LlmMessage, LlmChatResponse } from "../llm/model";

export interface LLMFunctionCaller {
  chat(messages: LlmMessage[], options?: any): Promise<LlmChatResponse & { toolCalls?: ToolCall[] }>;
}

/**
 * Layer [A] Autonomous ReAct Reasoning Loop
 * Orchestrates: User Query -> Reason -> Tool Action -> Observation -> Final Answer
 */
export class ReActLoop {
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
    const steps: AgentStep[] = [];
    const toolMap = new Map<string, AgentTool>(tools.map((t) => [t.name, t]));

    const formattedTools = tools.length > 0 ? tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: "object", properties: {} }
      }
    })) : undefined;

    // 1. Append user input to session memory
    await memory.append({
      role: "user",
      content: userInput,
      timestamp: startTime
    });

    let currentStep = 1;
    let finalOutput = "";
    let finalThought: string | undefined = undefined;
    let finishReason: "stop" | "max_steps_reached" | "error" = "max_steps_reached";
    let usedModel = options.model || "unknown";

    // 2. Build system instruction from Intent & Name (Intent IS the system prompt)
    const systemInstruction = options.systemPrompt ??
      `You are ${context.agentName}.
Your intent: ${context.intent || "Autonomous AI Agent"}.
Follow the ReAct methodology: Reason carefully, invoke tools when needed, observe results, and provide a clear final answer.`;

    // 3. ReAct Step Loop
    while (currentStep <= maxSteps) {
      const stepStartTime = Date.now();

      // Retrieve full accumulated conversation history from Layer [I]
      const conversationHistory: LlmMessage[] = memory.getMessages().map((m) => {
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

      const messages: LlmMessage[] = [
        { role: "system", content: systemInstruction },
        ...conversationHistory
      ];

      // Query Layer [L] Model
      const response = await llm.chat(messages, {
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature ?? 0.2,
        tools: formattedTools,
        apiKey: options.apiKey
      });

      usedModel = response.model || usedModel;
      const thought = response.reasoningContent;
      if (thought) {
        finalThought = thought;
      }

      const requestedToolCalls: ToolCall[] = response.toolCalls || [];

      // Case A: Model requested tool execution
      if (requestedToolCalls.length > 0) {
        await memory.append({
          role: "assistant",
          content: response.text || "",
          reasoningContent: thought,
          toolCalls: requestedToolCalls,
          timestamp: stepStartTime
        });

        const stepResults: ToolResult[] = [];

        for (const tc of requestedToolCalls) {
          const tool = toolMap.get(tc.name);
          let resultStr: string;

          if (!tool) {
            resultStr = `Error: Tool '${tc.name}' not found. Available: ${Array.from(toolMap.keys()).join(", ")}`;
          } else {
            try {
              const res = await tool.execute(tc.arguments, context);
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

          // Append tool observation to Layer [I] session memory
          await memory.append({
            role: "tool",
            name: tc.name,
            toolCallId: tc.id,
            content: resultStr,
            timestamp: Date.now()
          });
        }

        steps.push({
          step: currentStep,
          thought,
          toolCalls: requestedToolCalls,
          toolResults: stepResults,
          timestamp: stepStartTime
        });

        currentStep++;
      } else {
        // Case B: Final text answer produced
        finalOutput = response.text;
        finishReason = "stop";

        steps.push({
          step: currentStep,
          thought,
          output: finalOutput,
          timestamp: stepStartTime
        });

        // Append final assistant reply to Layer [I] session memory
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
      thought: finalThought,
      steps,
      totalSteps: steps.length,
      model: usedModel,
      durationMs: Date.now() - startTime,
      finishReason
    };
  }
}

