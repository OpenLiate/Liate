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
            model: (() => {
              if (!raw.L) return "(unspecified)";
              if (typeof raw.L === "string") return raw.L;
              // MultiModelMap: show all tags
              if (typeof raw.L === "object" && !("model" in raw.L)) {
                return Object.entries(raw.L)
                  .map(([tag, m]) => `${tag}:${typeof m === "string" ? m : (m as any).model}`)
                  .join(" | ");
              }
              return raw.L?.model || "(unspecified)";
            })(),
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

  // 3. Ephemeral agent using explicit LIATE_MODEL env var (never hardcoded)
  const envModel = process.env.LIATE_MODEL?.trim();
  if (!envModel) {
    throw new Error(
      "[Liate Error]: No agent.ts / agent.json found and LIATE_MODEL is not set. Pass an agent file, a hub agent name (e.g. 'ollama-agent', 'openrouter-agent', 'sarvam-agent'), or set LIATE_MODEL."
    );
  }

  const ephemeralAgent = liate.from({
    L: envModel,
    A: { name: "liate-agent", intent: "Autonomous Sovereign Agent" },
    E: {}
  });

  return { agent: ephemeralAgent, sourceType: "ephemeral" };
}
