import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AgentVersionDiff, AgentVersionSnapshot } from "@/layers/agent/types";
import { diffAgentSnapshots } from "@/layers/agent/versioning/diff";

function canonicalize(value: any): any {
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const out: Record<string, any> = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = canonicalize(value[key]);
  }
  return out;
}

/**
 * Layer [A] AI Agent Version Control
 *
 * Tracks immutable snapshots of an agent's L · I · A · T specification
 * (never storing Layer [E] secrets), computes deterministic SHA-256 hashes,
 * diffs versions structurally, and supports rollback via checkout().
 */
export class AgentVersionControl {
  private memoryStore = new Map<string, AgentVersionSnapshot[]>();
  private readonly baseDir?: string;

  constructor(baseDir?: string) {
    if (baseDir !== ":memory:") {
      this.baseDir = baseDir
        ? resolve(process.cwd(), baseDir)
        : resolve(process.cwd(), ".liate", "versions");
    }
  }

  /**
   * Strips Layer [E] secrets and normalizes L · I · A · T into a snapshot-safe spec.
   */
  public static sanitizeSpec(spec: { L: any; I?: any; A: any; T?: any }): AgentVersionSnapshot["spec"] {
    const aObj = typeof spec.A === "string" ? { name: spec.A } : { ...(spec.A || {}) };
    return {
      L: canonicalize(spec.L),
      I: spec.I ? canonicalize(spec.I) : {},
      A: canonicalize(aObj),
      T: spec.T ? canonicalize(spec.T) : []
    };
  }

  /**
   * Computes a deterministic 12-char SHA-256 fingerprint of an agent's L · I · A · T spec.
   */
  public static hashSpec(spec: { L: any; I?: any; A: any; T?: any }): string {
    const clean = AgentVersionControl.sanitizeSpec(spec);
    return createHash("sha256")
      .update(JSON.stringify(clean))
      .digest("hex")
      .slice(0, 12);
  }

  private getAgentDir(agentName: string): string | undefined {
    if (!this.baseDir) return undefined;
    const safeName = agentName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return join(this.baseDir, safeName);
  }

  /**
   * Commits a new immutable version snapshot for an agent.
   */
  public commit(
    spec: { L: any; I?: any; A: any; T?: any },
    options: { version?: string; message?: string } = {}
  ): AgentVersionSnapshot {
    const sanitized = AgentVersionControl.sanitizeSpec(spec);
    const agentName = String(sanitized.A?.name || "agent");
    const history = this.log(agentName);
    const latest = history[history.length - 1];

    const version =
      options.version ||
      sanitized.A?.version ||
      `0.0.${history.length + 1}`;

    sanitized.A.version = version;
    const hash = AgentVersionControl.hashSpec(sanitized);

    const snapshot: AgentVersionSnapshot = {
      agentName,
      version,
      hash,
      parentHash: latest?.hash,
      message: options.message || `Snapshot ${version}`,
      timestamp: new Date().toISOString(),
      spec: sanitized
    };

    const nextHistory = [...history, snapshot];
    this.memoryStore.set(agentName, nextHistory);

    const agentDir = this.getAgentDir(agentName);
    if (agentDir) {
      mkdirSync(agentDir, { recursive: true });
      const safeVer = version.replace(/[^a-zA-Z0-9._-]/g, "_");
      writeFileSync(
        join(agentDir, `${safeVer}.json`),
        JSON.stringify(snapshot, null, 2) + "\n",
        "utf-8"
      );
    }

    return snapshot;
  }

  /**
   * Lists all recorded snapshots for an agent in chronological order.
   */
  public log(agentName: string): AgentVersionSnapshot[] {
    const agentDir = this.getAgentDir(agentName);
    if (agentDir && existsSync(agentDir)) {
      const files = readdirSync(agentDir).filter((f) => f.endsWith(".json"));
      const loaded = files
        .map((f) => {
          try {
            return JSON.parse(readFileSync(join(agentDir, f), "utf-8")) as AgentVersionSnapshot;
          } catch {
            return null;
          }
        })
        .filter((s): s is AgentVersionSnapshot => Boolean(s));

      loaded.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      this.memoryStore.set(agentName, loaded);
      return loaded;
    }

    return [...(this.memoryStore.get(agentName) || [])];
  }

  /**
   * Checks out a historical snapshot by version tag or hash prefix for rollback.
   */
  public checkout(agentName: string, versionOrHash: string): AgentVersionSnapshot {
    const history = this.log(agentName);
    const found = history.find(
      (s) => s.version === versionOrHash || s.hash === versionOrHash || s.hash.startsWith(versionOrHash)
    );
    if (!found) {
      throw new Error(
        `[Liate VersionControl]: Version '${versionOrHash}' not found for agent '${agentName}'.`
      );
    }
    return found;
  }

  /**
   * Computes structural diff between two recorded versions of an agent.
   */
  public diff(agentName: string, fromVersion: string, toVersion: string): AgentVersionDiff {
    const fromSnap = this.checkout(agentName, fromVersion);
    const toSnap = this.checkout(agentName, toVersion);
    return diffAgentSnapshots(fromSnap, toSnap);
  }
}
