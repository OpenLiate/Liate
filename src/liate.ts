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
export * from "@/layers/integration/repo";
export * from "@/layers/integration/lib";
export * from "@/layers/agent/harness";
export * from "@/layers/agent/loop";
export * from "@/layers/agent/skills";
export * from "@/layers/agent/types";
export * from "@/layers/tools/mcp";
export * from "@/layers/tools/server";
export * from "@/layers/tools/registry";
export * from "@/layers/environment/sandbox";
export * from "@/layers/environment/types";

// Canonical exports to resolve cross-layer duplicates
export type { AgentTool, ToolCall } from "@/layers/agent/types";

// 2. Core Specification, AUM & OM Engine + Scaffolder
export * from "@/core/spec";
export * from "@/core/aum";
export * from "@/core/om";
export * from "@/core/version";
export * from "@/core/uuid";
export * from "@/scaffold/project";

// 3. Default Export: The universal base class
import { liate } from "@/core/om";
export default liate;

// 4. CLI Direct Execution Entrypoint (only if run directly as script)
if (typeof import.meta !== "undefined" && import.meta.main && process.argv[1] && (process.argv[1].endsWith("liate.ts") || process.argv[1].endsWith("liate.js"))) {
  let rawArgs = process.argv.slice(2);
  if (rawArgs[0] === "run") {
    rawArgs = rawArgs.slice(1);
  }
  const targetFile = rawArgs[0] && !rawArgs[0].startsWith("-") ? rawArgs[0] : "agent.json";
  const prompt = (rawArgs[0] && !rawArgs[0].startsWith("-") ? rawArgs.slice(1) : rawArgs).join(" ") || "Hello! Confirm you are running pure Liate.";

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
