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
export * from "@/layers/integration/memory/session";
export * from "@/layers/integration/memory/adapters/registry";
export * from "@/layers/integration/knowledge/manager";
export * from "@/layers/integration/knowledge/embeddings";
export * from "@/layers/integration/knowledge/sources/pgvector";
export * from "@/layers/integration/knowledge/sources/pinecone";
export * from "@/layers/integration/resolver";
export * from "@/layers/integration/context/context";
export * from "@/layers/integration/repo/resolver";
export * from "@/layers/integration/lib/loader";
export * from "@/layers/integration/connectors/registry";
export * from "@/layers/agent/harness/agent";
export * from "@/layers/agent/loop/react";
export * from "@/layers/agent/skills/resolver";
export * from "@/layers/agent/orchestration/subagent";
export * from "@/layers/agent/orchestration/workflow";
export * from "@/layers/agent/versioning/store";
export * from "@/layers/agent/versioning/diff";
export * from "@/layers/agent/a2a/a2a";
export * from "@/layers/agent/checkpoint/store";
export * from "@/layers/agent/checkpoint/durable";
export * from "@/layers/agent/schema/structured";
export * from "@/layers/agent/eval/scorers";
export * from "@/layers/agent/eval/runner";
export * from "@/layers/agent/types";
export * from "@/runtime/cron";
export * from "@/layers/tools/mcp/client";
export * from "@/layers/tools/mcp/server";
export * from "@/layers/tools/mcp/inline";
export * from "@/layers/tools/builtin/registry";
export * from "@/layers/tools/api/builder";
export * from "@/layers/tools/api/registry";
export * from "@/layers/tools/registry/resolver";
export * from "@/layers/environment/resolver";
export * from "@/layers/environment/telemetry/tracer";
export * from "@/layers/environment/types";

// Canonical exports to resolve cross-layer duplicates
export type { AgentTool, ToolCall, SubAgentSpec } from "@/layers/agent/types";

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
