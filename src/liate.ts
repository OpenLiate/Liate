/**
 * Liate — Open Source AI Agents Framework
 * Built for Sovereign AI Agents From India to the World.
 *
 * Universal Framework Entrypoint & SDK Exports
 *
 * Usage:
 *   import { liate } from "@openliate/liate";
 *   class MyAgent extends liate { L; I; A; T; E; }
 */

// 1. The 5 Layers (L · I · A · T · E)
export * from "@/layers/llm/model";
export * from "@/layers/integration/memory";
export * from "@/layers/integration/knowledge";
export * from "@/layers/agent/harness";
export * from "@/layers/agent/loop";
export * from "@/layers/agent/types";
export * from "@/layers/tools/mcp";
export * from "@/layers/tools/server";
export * from "@/layers/tools/registry";
export * from "@/layers/environment/sandbox";
export * from "@/layers/environment/types";

// Canonical exports to resolve cross-layer duplicates
export type { AgentTool, ToolCall } from "@/layers/agent/types";

// 2. Core Specification, AUM & OM Engine
export * from "@/core/spec";
export * from "@/core/aum";
export * from "@/core/om";

// 3. Default Export: The universal base class
import { liate } from "@/core/om";
export default liate;

// 4. CLI Direct Execution Entrypoint
if (import.meta.main) {
  const args = process.argv.slice(2);
  const targetFile = args[0] && !args[0].startsWith("-") ? args[0] : "agent.json";
  const prompt = (args[0] && !args[0].startsWith("-") ? args.slice(1) : args).join(" ") || "Hello! Confirm you are running pure Liate.";

  try {
    const agent = await liate.load(targetFile);
    console.log(`[Liate] Running ${targetFile} (Agent: ${agent.A?.name || "Agent"})...`);
    console.log(`[Prompt] "${prompt}"\n`);
    const result = await agent.run(prompt);
    console.log(`[Response]\n${result.text}\n`);
    console.log(`[Stats] Steps: ${result.totalSteps} | Duration: ${result.durationMs}ms | Finish: ${result.finishReason}`);
    await agent.close();
    process.exit(0);
  } catch (err: any) {
    console.error(`[Liate Error] ${err.message}`);
    process.exit(1);
  }
}
