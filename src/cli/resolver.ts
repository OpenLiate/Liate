// src/cli/resolver.ts
// Liate CLI Dynamic Agent Resolver & Local Hub

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, isAbsolute, extname, join } from "node:path";
import { liate } from "@/core/om";

export interface ResolvedAgentTarget {
  agent: liate;
  sourcePath?: string;
  sourceType: "typescript" | "javascript" | "json" | "hub" | "ephemeral";
}

export interface HubAgentSummary {
  id: string;
  name: string;
  model: string;
  intent: string;
  path: string;
}

/**
 * Lists all local agent templates available in hub/agents
 */
export function listLocalHubAgents(): HubAgentSummary[] {
  const cwd = process.cwd();
  const hubDir = resolve(cwd, "hub", "agents");

  if (!existsSync(hubDir)) {
    return [];
  }

  const list: HubAgentSummary[] = [];
  const entries = readdirSync(hubDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const agentJsonPath = join(hubDir, entry.name, "agent.json");
      if (existsSync(agentJsonPath)) {
        try {
          const raw = JSON.parse(readFileSync(agentJsonPath, "utf-8"));
          list.push({
            id: entry.name,
            name: raw.A?.name || entry.name,
            model: typeof raw.L === "string" ? raw.L : (raw.L?.model || "sarvam/sarvam-105b"),
            intent: raw.A?.intent || "Autonomous Sovereign Agent",
            path: agentJsonPath
          });
        } catch {
          // Skip invalid json
        }
      }
    }
  }

  return list;
}

/**
 * Discovers and loads an agent from an explicit file path, local hub, or current directory
 */
export async function resolveAgent(customTarget?: string): Promise<ResolvedAgentTarget> {
  const cwd = process.cwd();

  // 1. Explicit path or hub agent name passed by user
  if (customTarget && customTarget.trim().length > 0) {
    let candidatePath = isAbsolute(customTarget) ? customTarget : resolve(cwd, customTarget);

    // Check if target is a hub agent directory name (e.g. "sarvam-agent" or "prism-agent")
    const hubCandidate = resolve(cwd, "hub", "agents", customTarget, "agent.json");
    if (existsSync(hubCandidate)) {
      const agent = await liate.load(hubCandidate);
      return { agent, sourcePath: hubCandidate, sourceType: "hub" };
    }

    // Check if candidatePath is a directory containing agent.json
    if (existsSync(candidatePath) && statSync(candidatePath).isDirectory()) {
      const dirJson = join(candidatePath, "agent.json");
      if (existsSync(dirJson)) {
        const agent = await liate.load(dirJson);
        return { agent, sourcePath: dirJson, sourceType: "json" };
      }
    }

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
