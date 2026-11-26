import type { AgentTool } from "@/layers/agent/types";
import { builtinDatetimeTool } from "@/layers/tools/builtin/datetime";
import { builtinMathTool } from "@/layers/tools/builtin/math";

/**
 * Built-in Layer [T] Local Tools.
 * Contributors add new local tools under src/layers/tools/builtin/ and register them here.
 */
export const BUILTIN_TOOLS: Record<string, AgentTool> = {
  datetime: builtinDatetimeTool,
  math: builtinMathTool
};

export function listBuiltinTools(): string[] {
  return Object.keys(BUILTIN_TOOLS);
}

export function resolveBuiltinTool(name: string): AgentTool[] {
  const clean = name.replace(/^builtin:/i, "").trim().toLowerCase();
  if (clean === "*" || clean === "all") {
    return Object.values(BUILTIN_TOOLS);
  }
  const found = BUILTIN_TOOLS[clean];
  return found ? [found] : [];
}
