import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { AgentStep, ToolCall } from "@/layers/agent/types";
import type { AgentMessage } from "@/layers/integration/types";

export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
  /** Optional modified arguments keyed by tool call ID or tool name */
  updatedArgs?: Record<string, Record<string, any>>;
}

export interface CheckpointSnapshot {
  checkpointId: string;
  agentName: string;
  sessionId?: string;
  step: number;
  maxSteps: number;
  model: string;
  systemInstruction: string;
  messages: AgentMessage[];
  steps: AgentStep[];
  pendingToolCalls: ToolCall[];
  status: "paused" | "completed" | "rejected";
  createdAt: string;
  updatedAt: string;
}

/**
 * Layer [A] Durable Checkpoint & Human-in-the-Loop (HITL) Store
 * Persists suspended ReAct loop state in memory and optionally to disk (`.liate/checkpoints`).
 */
export class CheckpointStore {
  private static memoryMap = new Map<string, CheckpointSnapshot>();
  private readonly dirPath?: string;

  constructor(dirPath?: string) {
    this.dirPath = dirPath ? resolve(process.cwd(), dirPath) : undefined;
    if (this.dirPath && !existsSync(this.dirPath)) {
      mkdirSync(this.dirPath, { recursive: true });
    }
  }

  public createId(): string {
    return `chk_${randomUUID()}`;
  }

  public save(snapshot: CheckpointSnapshot): CheckpointSnapshot {
    const updated: CheckpointSnapshot = {
      ...snapshot,
      updatedAt: new Date().toISOString()
    };
    CheckpointStore.memoryMap.set(updated.checkpointId, updated);

    if (this.dirPath) {
      const file = join(this.dirPath, `${updated.checkpointId}.json`);
      writeFileSync(file, JSON.stringify(updated, null, 2), "utf-8");
    }
    return updated;
  }

  public get(checkpointId: string): CheckpointSnapshot | null {
    const mem = CheckpointStore.memoryMap.get(checkpointId);
    if (mem) return mem;

    if (this.dirPath) {
      const file = join(this.dirPath, `${checkpointId}.json`);
      if (existsSync(file)) {
        const parsed = JSON.parse(readFileSync(file, "utf-8")) as CheckpointSnapshot;
        CheckpointStore.memoryMap.set(checkpointId, parsed);
        return parsed;
      }
    }
    return null;
  }

  public list(): CheckpointSnapshot[] {
    if (this.dirPath && existsSync(this.dirPath)) {
      for (const f of readdirSync(this.dirPath)) {
        if (f.endsWith(".json")) {
          const id = f.slice(0, -5);
          if (!CheckpointStore.memoryMap.has(id)) {
            this.get(id);
          }
        }
      }
    }
    return Array.from(CheckpointStore.memoryMap.values());
  }

  public delete(checkpointId: string): void {
    CheckpointStore.memoryMap.delete(checkpointId);
    if (this.dirPath) {
      const file = join(this.dirPath, `${checkpointId}.json`);
      if (existsSync(file)) {
        rmSync(file, { force: true });
      }
    }
  }
}

export const defaultCheckpointStore = new CheckpointStore();
