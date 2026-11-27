import type { ScheduleSpec } from "@/core/spec";
import type { AgentRunResult } from "@/layers/agent/types";
import { DurableRunStore, type CronJobRecord } from "@/layers/agent/checkpoint/durable";

export interface ParsedCron {
  kind: "interval" | "cron";
  intervalMs?: number;
  minutes?: Set<number>;
  hours?: Set<number>;
  daysOfMonth?: Set<number>;
  months?: Set<number>;
  daysOfWeek?: Set<number>;
}

const CRON_ALIASES: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *"
};

function parseCronField(field: string, min: number, max: number): Set<number> {
  const result = new Set<number>();
  for (const part of field.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const [rangePart, stepPart] = trimmed.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step <= 0) {
      throw new Error(`[Liate Cron Error]: Invalid cron step '${trimmed}'.`);
    }

    let start = min;
    let end = max;
    if (rangePart !== "*") {
      if (rangePart.includes("-")) {
        const [a, b] = rangePart.split("-").map(Number);
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < min || b > max || a > b) {
          throw new Error(`[Liate Cron Error]: Invalid cron range '${trimmed}'.`);
        }
        start = a;
        end = b;
      } else {
        const val = Number(rangePart);
        if (!Number.isInteger(val) || val < min || val > max) {
          throw new Error(`[Liate Cron Error]: Value out of range in '${trimmed}'.`);
        }
        start = val;
        end = stepPart ? max : val;
      }
    }

    for (let v = start; v <= end; v += step) {
      result.add(v);
    }
  }
  if (result.size === 0) {
    throw new Error(`[Liate Cron Error]: Empty cron field '${field}'.`);
  }
  return result;
}

/**
 * Parses a standard 5-field cron expression, alias (@hourly, @daily, @weekly),
 * or interval shorthand (@every 30s / @every 5m / @every 1h).
 */
export function parseCron(expr: string): ParsedCron {
  const trimmed = expr.trim();
  const everyMatch = trimmed.match(/^@every\s+(\d+)(ms|s|m|h)$/i);
  if (everyMatch) {
    const amount = Number(everyMatch[1]);
    const unit = everyMatch[2].toLowerCase();
    const mult = unit === "ms" ? 1 : unit === "s" ? 1000 : unit === "m" ? 60_000 : 3_600_000;
    if (amount <= 0) throw new Error(`[Liate Cron Error]: Interval must be > 0 in '${expr}'.`);
    return { kind: "interval", intervalMs: amount * mult };
  }

  const normalized = CRON_ALIASES[trimmed.toLowerCase()] || trimmed;
  const parts = normalized.split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`[Liate Cron Error]: Expected 5 cron fields in '${expr}'.`);
  }

  return {
    kind: "cron",
    minutes: parseCronField(parts[0], 0, 59),
    hours: parseCronField(parts[1], 0, 23),
    daysOfMonth: parseCronField(parts[2], 1, 31),
    months: parseCronField(parts[3], 1, 12),
    daysOfWeek: parseCronField(parts[4], 0, 6)
  };
}

export function matchesCron(expr: string, date: Date): boolean {
  const parsed = parseCron(expr);
  if (parsed.kind === "interval") return true;
  return (
    parsed.minutes!.has(date.getUTCMinutes()) &&
    parsed.hours!.has(date.getUTCHours()) &&
    parsed.daysOfMonth!.has(date.getUTCDate()) &&
    parsed.months!.has(date.getUTCMonth() + 1) &&
    parsed.daysOfWeek!.has(date.getUTCDay())
  );
}

/**
 * Computes the next scheduled UTC execution timestamp strictly after `fromDate`.
 */
export function getNextRun(expr: string, fromDate: Date = new Date()): Date {
  const parsed = parseCron(expr);
  if (parsed.kind === "interval") {
    return new Date(fromDate.getTime() + parsed.intervalMs!);
  }

  // Advance to the start of the next minute
  const candidate = new Date(fromDate.getTime());
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  // Scan up to 1 year (525,960 minutes)
  for (let i = 0; i < 525960; i++) {
    if (
      parsed.minutes!.has(candidate.getUTCMinutes()) &&
      parsed.hours!.has(candidate.getUTCHours()) &&
      parsed.daysOfMonth!.has(candidate.getUTCDate()) &&
      parsed.months!.has(candidate.getUTCMonth() + 1) &&
      parsed.daysOfWeek!.has(candidate.getUTCDay())
    ) {
      return candidate;
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  throw new Error(`[Liate Cron Error]: Could not find next run within 1 year for '${expr}'.`);
}

export interface RegisteredCronTarget {
  agentName: string;
  spec: ScheduleSpec;
  runner: (prompt: string) => Promise<AgentRunResult>;
}

/**
 * Runtime Cron Scheduler with Layer [I] SQLite persistence and Layer [E] concurrency guards.
 */
export class CronScheduler {
  private readonly store: DurableRunStore;
  private readonly targets = new Map<string, RegisteredCronTarget>();
  private readonly activeCounts = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(store?: DurableRunStore) {
    this.store = store || new DurableRunStore();
  }

  public async register(
    agentName: string,
    schedule: string | ScheduleSpec | ScheduleSpec[],
    runner: (prompt: string) => Promise<AgentRunResult>
  ): Promise<CronJobRecord[]> {
    const specs: ScheduleSpec[] = Array.isArray(schedule)
      ? schedule
      : typeof schedule === "string"
        ? [{ cron: schedule }]
        : [schedule];

    const records: CronJobRecord[] = [];
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const jobId = spec.id || `${agentName}_cron_${i}`;
      const nextRun = getNextRun(spec.cron, new Date());
      // Validate cron expression eagerly
      parseCron(spec.cron);

      this.targets.set(jobId, { agentName, spec, runner });
      const saved = await this.store.upsertCronJob({
        jobId,
        agentName,
        cronExpr: spec.cron,
        prompt: spec.prompt || `Scheduled run for ${agentName}`,
        timezone: spec.timezone || "UTC",
        enabled: spec.enabled !== false,
        maxConcurrentRuns: spec.maxConcurrentRuns ?? 1,
        nextRunAt: nextRun.toISOString()
      });
      records.push(saved);
    }
    return records;
  }

  public async listJobs(agentName?: string): Promise<CronJobRecord[]> {
    return this.store.listCronJobs(agentName);
  }

  public async triggerNow(jobId: string): Promise<{ status: "success" | "error" | "skipped"; result?: AgentRunResult; error?: string }> {
    const target = this.targets.get(jobId);
    const job = await this.store.getCronJob(jobId);
    if (!target || !job) {
      throw new Error(`[Liate Cron Error]: Cron job '${jobId}' is not registered.`);
    }

    const active = this.activeCounts.get(jobId) || 0;
    if (active >= job.maxConcurrentRuns) {
      const now = new Date();
      await this.store.recordCronExecution(jobId, {
        lastRunAt: now.toISOString(),
        nextRunAt: getNextRun(job.cronExpr, now).toISOString(),
        lastStatus: "skipped",
        lastError: `Max concurrent runs (${job.maxConcurrentRuns}) reached`,
        incrementCount: false
      });
      return { status: "skipped" };
    }

    this.activeCounts.set(jobId, active + 1);
    const startedAt = new Date();
    try {
      const result = await target.runner(job.prompt);
      const next = getNextRun(job.cronExpr, new Date());
      await this.store.recordCronExecution(jobId, {
        lastRunAt: startedAt.toISOString(),
        nextRunAt: next.toISOString(),
        lastStatus: "success",
        lastRunId: (result as any).runId || result.checkpointId
      });
      return { status: "success", result };
    } catch (err: any) {
      const next = getNextRun(job.cronExpr, new Date());
      const msg = err?.message || String(err);
      await this.store.recordCronExecution(jobId, {
        lastRunAt: startedAt.toISOString(),
        nextRunAt: next.toISOString(),
        lastStatus: "error",
        lastError: msg
      });
      return { status: "error", error: msg };
    } finally {
      this.activeCounts.set(jobId, Math.max(0, (this.activeCounts.get(jobId) || 1) - 1));
    }
  }

  public async tickOnce(now: Date = new Date()): Promise<string[]> {
    const jobs = await this.store.listCronJobs();
    const fired: string[] = [];
    for (const job of jobs) {
      if (!job.enabled || !this.targets.has(job.jobId)) continue;
      if (new Date(job.nextRunAt).getTime() <= now.getTime()) {
        await this.triggerNow(job.jobId);
        fired.push(job.jobId);
      }
    }
    return fired;
  }

  public start(pollIntervalMs: number = 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tickOnce();
    }, pollIntervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public close(): void {
    this.stop();
    this.store.close();
  }
}
