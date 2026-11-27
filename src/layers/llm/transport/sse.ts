import type { LlmChatResponse } from "@/layers/llm/types";

function createSseAccumulator(
  fallbackModel: string,
  onToken?: (chunk: string) => void,
  onReasoningToken?: (chunk: string) => void
) {
  let text = "";
  let reasoning = "";
  let resolvedModel = fallbackModel;
  let usage: LlmChatResponse["usage"] = undefined;
  const toolCallAcc = new Map<number, { id: string; name: string; argsRaw: string }>();

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) return;
    const dataStr = trimmed.slice(5).trim();
    if (dataStr === "[DONE]") return;

    try {
      const parsed = JSON.parse(dataStr);
      if (parsed.model) resolvedModel = parsed.model;
      if (parsed.usage) {
        usage = {
          promptTokens: parsed.usage.prompt_tokens || parsed.usage.promptTokens || 0,
          completionTokens: parsed.usage.completion_tokens || parsed.usage.completionTokens || 0,
          totalTokens: parsed.usage.total_tokens || parsed.usage.totalTokens || 0
        };
      }
      const delta = parsed.choices?.[0]?.delta;
      if (!delta) return;

      const rChunk = delta.reasoning_content || delta.reasoning;
      if (typeof rChunk === "string" && rChunk.length > 0) {
        reasoning += rChunk;
        onReasoningToken?.(rChunk);
      }

      if (typeof delta.content === "string" && delta.content.length > 0) {
        text += delta.content;
        onToken?.(delta.content);
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = typeof tc.index === "number" ? tc.index : 0;
          const prev = toolCallAcc.get(idx) || {
            id: tc.id || `call_${Date.now()}_${idx}`,
            name: "",
            argsRaw: ""
          };
          if (tc.id) prev.id = tc.id;
          if (tc.function?.name) prev.name += tc.function.name;
          if (tc.function?.arguments) prev.argsRaw += tc.function.arguments;
          toolCallAcc.set(idx, prev);
        }
      }
    } catch {}
  };

  const finalize = (): LlmChatResponse => {
    const toolCalls = toolCallAcc.size > 0
      ? Array.from(toolCallAcc.values()).map((tc) => {
          let args: Record<string, any> = {};
          try {
            args = tc.argsRaw ? JSON.parse(tc.argsRaw) : {};
          } catch {
            args = { raw: tc.argsRaw };
          }
          return { id: tc.id, name: tc.name, arguments: args };
        })
      : undefined;

    return {
      text: text || reasoning,
      reasoningContent: reasoning || undefined,
      toolCalls,
      model: resolvedModel,
      usage
    };
  };

  return { processLine, finalize };
}

/**
 * Parses a buffered OpenAI-compatible Server-Sent Events (SSE) payload string.
 */
export function parseSseText(
  rawText: string,
  fallbackModel: string,
  onToken?: (chunk: string) => void,
  onReasoningToken?: (chunk: string) => void
): LlmChatResponse {
  const { processLine, finalize } = createSseAccumulator(fallbackModel, onToken, onReasoningToken);
  for (const line of rawText.split(/\r?\n/)) {
    processLine(line);
  }
  return finalize();
}

/**
 * Parses an OpenAI-compatible Server-Sent Events (SSE) chat completion stream,
 * invoking token callbacks live while accumulating text, reasoning, and tool calls.
 */
export async function parseSseStream(
  response: Response,
  fallbackModel: string,
  onToken?: (chunk: string) => void,
  onReasoningToken?: (chunk: string) => void
): Promise<LlmChatResponse> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const { processLine, finalize } = createSseAccumulator(fallbackModel, onToken, onReasoningToken);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      processLine(line);
    }
  }
  if (buffer) processLine(buffer);

  return finalize();
}
