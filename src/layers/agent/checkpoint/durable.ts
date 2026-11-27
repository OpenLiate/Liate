import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type DurableRunStatus = "running" | "paused" | "completed" | "failed";

export interface DurableStepRecord {
  stepId: string;
  type: string;
  output: string;
  data?: any;
  completedAt: string;
}

export interface DurableRunRecord {
  runId: string;
  agentName: string;
  status: DurableRunStatus;
  input: string;
  currentStepIndex: number;
  stepOutputs: Record<string, DurableStepRecord>;
  finalOutput?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CronJobRecord {
  jobId: string;
  agentName: string;
  cronExpr: string;
  prompt: string;
  timezone: string;
  enabled: boolean;
  maxConcurrentRuns: number;
  lastRunAt?: string;
  nextRunAt: string;
  lastStatus?: "success" | "error" | "skipped";
  lastRunId?: string;
  lastError?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Layer [A] + [I] Durable Execution & Cron Persistence Store.
 * Backed by `bun:sqlite` so workflow step outputs and cron schedules survive restarts.
 */
export class DurableRunStore {
  private readonly dbPath: string;
  private dbInstance: any = null;

  constructor(target: string | boolean = ".liate/durable.db") {
    const raw = typeof target === "string" && target.trim().length > 0
      ? target.trim().replace(/^sqlite:\/\//, "")
      : ".liate/durable.db";
    if (raw === ":memory:") {
      this.dbPath = ":memory:";
    } else {
      this.dbPath = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
    }
  }

  private async getDb() {
    if (this.dbInstance) return this.dbInstance;
    if (this.dbPath !== ":memory:") {
      const dir = dirname(this.dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
    const mod = await import("bun:sqlite");
    const db = new mod.Database(this.dbPath);
    db.run(`
      CREATE TABLE IF NOT EXISTS liate_workflow_runs (
        run_id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        status TEXT NOT NULL,
        input TEXT NOT NULL,
        current_step_index INTEGER NOT NULL DEFAULT 0,
        step_outputs TEXT NOT NULL DEFAULT '{}',
        final_output TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS liate_cron_jobs (
        job_id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        cron_expr TEXT NOT NULL,
        prompt TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        enabled INTEGER NOT NULL DEFAULT 1,
        max_concurrent_runs INTEGER NOT NULL DEFAULT 1,
        last_run_at TEXT,
        next_run_at TEXT NOT NULL,
        last_status TEXT,
        last_run_id TEXT,
        last_error TEXT,
        run_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    this.dbInstance = db;
    return db;
  }

  public createRunId(): string {
    return `run_${randomUUID()}`;
  }

  private mapRunRow(row: any): DurableRunRecord {
    return {
      runId: row.run_id,
      agentName: row.agent_name,
      status: row.status as DurableRunStatus,
      input: row.input,
      currentStepIndex: Number(row.current_step_index ?? 0),
      stepOutputs: JSON.parse(row.step_outputs || "{}"),
      finalOutput: row.final_output ?? undefined,
      error: row.error ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapCronRow(row: any): CronJobRecord {
    return {
      jobId: row.job_id,
      agentName: row.agent_name,
      cronExpr: row.cron_expr,
      prompt: row.prompt,
      timezone: row.timezone || "UTC",
      enabled: Boolean(row.enabled),
      maxConcurrentRuns: Number(row.max_concurrent_runs ?? 1),
      lastRunAt: row.last_run_at ?? undefined,
      nextRunAt: row.next_run_at,
      lastStatus: row.last_status ?? undefined,
      lastRunId: row.last_run_id ?? undefined,
      lastError: row.last_error ?? undefined,
      runCount: Number(row.run_count ?? 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async createRun(agentName: string, input: string, runId?: string): Promise<DurableRunRecord> {
    const db = await this.getDb();
    const id = runId || this.createRunId();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO liate_workflow_runs
       (run_id, agent_name, status, input, current_step_index, step_outputs, created_at, updated_at)
       VALUES (?, ?, 'running', ?, 0, '{}', ?, ?)
       ON CONFLICT(run_id) DO UPDATE SET
         status = 'running',
         updated_at = excluded.updated_at`,
      [id, agentName, input, now, now]
    );
    return (await this.getRun(id))!;
  }

  public async getRun(runId: string): Promise<DurableRunRecord | null> {
    const db = await this.getDb();
    const row = db
      .query("SELECT * FROM liate_workflow_runs WHERE run_id = ?")
      .get(runId) as any;
    return row ? this.mapRunRow(row) : null;
  }

  public async listRuns(agentName?: string): Promise<DurableRunRecord[]> {
    const db = await this.getDb();
    const rows = agentName
      ? (db.query("SELECT * FROM liate_workflow_runs WHERE agent_name = ? ORDER BY created_at DESC").all(agentName) as any[])
      : (db.query("SELECT * FROM liate_workflow_runs ORDER BY created_at DESC").all() as any[]);
    return rows.map((r) => this.mapRunRow(r));
  }

  public async saveStepResult(
    runId: string,
    stepIndex: number,
    record: DurableStepRecord
  ): Promise<DurableRunRecord> {
    const db = await this.getDb();
    const existing = await this.getRun(runId);
    if (!existing) {
      throw new Error(`[Liate Durable Error]: Run '${runId}' not found.`);
    }
    const updatedOutputs = {
      ...existing.stepOutputs,
      [record.stepId]: record
    };
    const now = new Date().toISOString();
    db.run(
      `UPDATE liate_workflow_runs
       SET current_step_index = ?, step_outputs = ?, updated_at = ?
       WHERE run_id = ?`,
      [stepIndex + 1, JSON.stringify(updatedOutputs), now, runId]
    );
    return (await this.getRun(runId))!;
  }

  public async updateRunStatus(
    runId: string,
    status: DurableRunStatus,
    extra?: { finalOutput?: string; error?: string; currentStepIndex?: number }
  ): Promise<DurableRunRecord> {
    const db = await this.getDb();
    const existing = await this.getRun(runId);
    if (!existing) {
      throw new Error(`[Liate Durable Error]: Run '${runId}' not found.`);
    }
    const now = new Date().toISOString();
    db.run(
      `UPDATE liate_workflow_runs
       SET status = ?, final_output = ?, error = ?, current_step_index = ?, updated_at = ?
       WHERE run_id = ?`,
      [
        status,
        extra?.finalOutput ?? existing.finalOutput ?? null,
        extra?.error ?? null,
        extra?.currentStepIndex ?? existing.currentStepIndex,
        now,
        runId
      ]
    );
    return (await this.getRun(runId))!;
  }

  public async upsertCronJob(job: Omit<CronJobRecord, "createdAt" | "updatedAt" | "runCount"> & { runCount?: number }): Promise<CronJobRecord> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO liate_cron_jobs
       (job_id, agent_name, cron_expr, prompt, timezone, enabled, max_concurrent_runs, last_run_at, next_run_at, last_status, last_run_id, last_error, run_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(job_id) DO UPDATE SET
         cron_expr = excluded.cron_expr,
         prompt = excluded.prompt,
         timezone = excluded.timezone,
         enabled = excluded.enabled,
         max_concurrent_runs = excluded.max_concurrent_runs,
         next_run_at = excluded.next_run_at,
         updated_at = excluded.updated_at`,
      [
        job.jobId,
        job.agentName,
        job.cronExpr,
        job.prompt,
        job.timezone || "UTC",
        job.enabled ? 1 : 0,
        job.maxConcurrentRuns ?? 1,
        job.lastRunAt ?? null,
        job.nextRunAt,
        job.lastStatus ?? null,
        job.lastRunId ?? null,
        job.lastError ?? null,
        job.runCount ?? 0,
        now,
        now
      ]
    );
    return (await this.getCronJob(job.jobId))!;
  }

  public async recordCronExecution(
    jobId: string,
    update: {
      lastRunAt: string;
      nextRunAt: string;
      lastStatus: "success" | "error" | "skipped";
      lastRunId?: string;
      lastError?: string;
      incrementCount?: boolean;
    }
  ): Promise<CronJobRecord | null> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    db.run(
      `UPDATE liate_cron_jobs
       SET last_run_at = ?,
           next_run_at = ?,
           last_status = ?,
           last_run_id = ?,
           last_error = ?,
           run_count = run_count + ?,
           updated_at = ?
       WHERE job_id = ?`,
      [
        update.lastRunAt,
        update.nextRunAt,
        update.lastStatus,
        update.lastRunId ?? null,
        update.lastError ?? null,
        update.incrementCount === false ? 0 : 1,
        now,
        jobId
      ]
    );
    return this.getCronJob(jobId);
  }

  public async getCronJob(jobId: string): Promise<CronJobRecord | null> {
    const db = await this.getDb();
    const row = db.query("SELECT * FROM liate_cron_jobs WHERE job_id = ?").get(jobId) as any;
    return row ? this.mapCronRow(row) : null;
  }

  public async listCronJobs(agentName?: string): Promise<CronJobRecord[]> {
    const db = await this.getDb();
    const rows = agentName
      ? (db.query("SELECT * FROM liate_cron_jobs WHERE agent_name = ? ORDER BY created_at ASC").all(agentName) as any[])
      : (db.query("SELECT * FROM liate_cron_jobs ORDER BY created_at ASC").all() as any[]);
    return rows.map((r) => this.mapCronRow(r));
  }

  public close(): void {
    if (this.dbInstance) {
      this.dbInstance.close();
      this.dbInstance = null;
    }
  }
}
