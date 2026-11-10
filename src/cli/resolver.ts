// src/cli/resolver.ts
// Liate CLI Dynamic Agent Resolver

import { existsSync } from "node:fs";
import { resolve, isAbsolute, extname } from "node:path";
import { liate } from "@/core/om";

export interface ResolvedAgentTarget {
  agent: liate;
  sourcePath?: string;
  sourceType: "typescript" | "javascript" | "json" | "ephemeral";
}

/**
 * Discovers and loads an agent from an explicit file path or current directory
 */
export async function resolveAgent(customTarget?: string): Promise<ResolvedAgentTarget> {
  const cwd = process.cwd();

  // 1. Explicit path passed by user
  if (customTarget && customTarget.trim().length > 0) {
    const candidatePath = isAbsolute(customTarget) ? customTarget : resolve(cwd, customTarget);

    if (existsSync(candidatePath)) {
      const ext = extname(candidatePath).toLowerCase();

      if (ext === ".json") {
        const agent = await liate.load(candidatePath);
        return { agent, sourcePath: candidatePath, sourceType: "json" };
      }

      if (ext === ".ts" || ext === ".js" || ext === ".mjs") {
        const imported = await import(candidatePath);
        const ExportedClass = imported.default || Object.values(imported).find(
          (val: any) => typeof val === "function" && (val.prototype instanceof liate || val === liate)
        );

        if (ExportedClass && typeof ExportedClass === "function") {
          const instance = new (ExportedClass as any)();
          return { agent: instance, sourcePath: candidatePath, sourceType: ext === ".ts" ? "typescript" : "javascript" };
        }

        if (imported.default instanceof liate) {
          return { agent: imported.default, sourcePath: candidatePath, sourceType: ext === ".ts" ? "typescript" : "javascript" };
        }
      }
    }
  }

  // 2. Automatic discovery in current directory: agent.ts -> agent.json -> agent.js
  const tsCandidate = resolve(cwd, "agent.ts");
  if (existsSync(tsCandidate)) {
    try {
      const imported = await import(tsCandidate);
      const ExportedClass = imported.default || Object.values(imported).find(
        (val: any) => typeof val === "function" && (val.prototype instanceof liate || val === liate)
      );

      if (ExportedClass && typeof ExportedClass === "function") {
        return { agent: new (ExportedClass as any)(), sourcePath: tsCandidate, sourceType: "typescript" };
      }
    } catch {
      // Fall through to json
    }
  }

  const jsonCandidate = resolve(cwd, "agent.json");
  if (existsSync(jsonCandidate)) {
    const agent = await liate.load(jsonCandidate);
    return { agent, sourcePath: jsonCandidate, sourceType: "json" };
  }

  const jsCandidate = resolve(cwd, "agent.js");
  if (existsSync(jsCandidate)) {
    const imported = await import(jsCandidate);
    const ExportedClass = imported.default || Object.values(imported).find(
      (val: any) => typeof val === "function" && (val.prototype instanceof liate || val === liate)
    );
    if (ExportedClass && typeof ExportedClass === "function") {
      return { agent: new (ExportedClass as any)(), sourcePath: jsCandidate, sourceType: "javascript" };
    }
  }

  // 3. Fallback: Ephemeral sovereign agent
  const fallbackAgent = liate.from({
    L: "sarvam/sarvam-105b-conversations",
    A: { name: "liate-agent", intent: "Autonomous Sovereign Agent" },
    E: { SARVAM_API_KEY: "$SARVAM_API_KEY" }
  });

  return { agent: fallbackAgent, sourceType: "ephemeral" };
}

