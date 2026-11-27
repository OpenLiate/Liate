import type { AgentExecutionOptions, AgentRunResult } from "@/layers/agent/types";
import { Tracer, type SpanAggregateStats } from "@/layers/environment/telemetry/tracer";
import { Scorers, type EvalScoreResult, type EvalScorer } from "@/layers/agent/eval/scorers";

export interface EvalCase {
  id?: string;
  name?: string;
  input: string;
  expected?: string;
  scorers?: EvalScorer[];
  options?: AgentExecutionOptions;
  metadata?: Record<string, any>;
}

export interface EvalCaseResult {
  id: string;
  name: string;
  input: string;
  output: string;
  passed: boolean;
  avgScore: number;
  durationMs: number;
  ttftMs?: number;
  ttfcMs?: number;
  totalSteps: number;
  model: string;
  scores: EvalScoreResult[];
  error?: string;
}

export interface EvalReport {
  suiteName: string;
  timestamp: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  minPassRate: number;
  passedThreshold: boolean;
  totalDurationMs: number;
  latency: {
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    avgTtftMs?: number;
    avgTtfcMs?: number;
  };
  spanStats: Record<string, SpanAggregateStats>;
  results: EvalCaseResult[];
}

export interface EvalRunnerOptions {
  suiteName?: string;
  concurrency?: number;
  minPassRate?: number;
  defaultScorers?: EvalScorer[];
  tracer?: Tracer;
}

export type EvalTarget =
  | { run(prompt: string, options?: AgentExecutionOptions): Promise<AgentRunResult> }
  | ((prompt: string, options?: AgentExecutionOptions) => Promise<AgentRunResult>);

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[idx]!.toFixed(3));
}

/**
 * Layer [A] Production Eval & Benchmark Runner
 * Runs datasets of EvalCases against any Liate agent or runner function,
 * aggregates TTFT / TTFC / p50 / p95 span telemetry, and outputs CI reports.
 */
export class EvalRunner {
  public static async run(
    target: EvalTarget,
    cases: EvalCase[],
    options: EvalRunnerOptions = {}
  ): Promise<EvalReport> {
    const suiteName = options.suiteName || "Liate Production Eval Suite";
    const concurrency = Math.max(1, options.concurrency ?? 1);
    const minPassRate = options.minPassRate ?? 1.0;
    const tracer = options.tracer || new Tracer(suiteName);
    const runFn = typeof target === "function" ? target : (p: string, o?: AgentExecutionOptions) => target.run(p, o);

    const suiteStart = performance.now();
    const results: EvalCaseResult[] = new Array(cases.length);
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const index = cursor++;
        if (index >= cases.length) break;

        const c = cases[index]!;
        const caseId = c.id || `case-${index + 1}`;
        const caseName = c.name || caseId;
        const caseSpan = tracer.startSpan("eval.case", {
          kind: "eval",
          attributes: { caseId, caseName }
        });

        let runResult: AgentRunResult | null = null;
        let runError: string | undefined;

        try {
          const origOnToken = c.options?.onToken;
          const origOnReasoning = c.options?.onReasoningToken;
          runResult = await runFn(c.input, {
            ...(c.options || {}),
            onToken: (chunk) => {
              caseSpan.markFirstToken();
              origOnToken?.(chunk);
            },
            onReasoningToken: (chunk) => {
              caseSpan.markFirstChunk();
              origOnReasoning?.(chunk);
            }
          });
        } catch (err: any) {
          runError = err?.message || String(err);
        }

        const recordedSpan = caseSpan.end(runError ? "error" : "ok", runError);

        if (runError || !runResult) {
          results[index] = {
            id: caseId,
            name: caseName,
            input: c.input,
            output: "",
            passed: false,
            avgScore: 0,
            durationMs: recordedSpan.durationMs,
            ttftMs: recordedSpan.ttftMs,
            ttfcMs: recordedSpan.ttfcMs,
            totalSteps: 0,
            model: "error",
            scores: [{ name: "execution", score: 0, passed: false, reason: runError }],
            error: runError
          };
          continue;
        }

        // Default to contains/exactMatch if expected provided without explicit scorers
        const activeScorers =
          c.scorers && c.scorers.length > 0
            ? c.scorers
            : options.defaultScorers && options.defaultScorers.length > 0
              ? options.defaultScorers
              : c.expected !== undefined
                ? [Scorers.contains(c.expected)]
                : [Scorers.custom("nonEmpty", (r) => r.text.trim().length > 0)];

        const scores: EvalScoreResult[] = [];
        for (const scorer of activeScorers) {
          scores.push(
            await scorer(runResult, {
              input: c.input,
              expected: c.expected,
              metadata: c.metadata
            })
          );
        }

        const passed = scores.every((s) => s.passed);
        const avgScore =
          scores.length > 0
            ? Number((scores.reduce((acc, s) => acc + s.score, 0) / scores.length).toFixed(4))
            : 1;

        results[index] = {
          id: caseId,
          name: caseName,
          input: c.input,
          output: runResult.text,
          passed,
          avgScore,
          durationMs: recordedSpan.durationMs,
          ttftMs: recordedSpan.ttftMs,
          ttfcMs: recordedSpan.ttfcMs,
          totalSteps: runResult.totalSteps,
          model: runResult.model,
          scores
        };
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, Math.max(1, cases.length)) }, () => worker())
    );

    const totalDurationMs = Number((performance.now() - suiteStart).toFixed(3));
    const passedCases = results.filter((r) => r.passed).length;
    const failedCases = results.length - passedCases;
    const passRate = results.length > 0 ? Number((passedCases / results.length).toFixed(4)) : 1;

    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const avgMs =
      durations.length > 0
        ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(3))
        : 0;
    const ttfts = results.map((r) => r.ttftMs).filter((v): v is number => typeof v === "number");
    const ttfcs = results.map((r) => r.ttfcMs).filter((v): v is number => typeof v === "number");

    return {
      suiteName,
      timestamp: new Date().toISOString(),
      totalCases: results.length,
      passedCases,
      failedCases,
      passRate,
      minPassRate,
      passedThreshold: passRate >= minPassRate,
      totalDurationMs,
      latency: {
        avgMs,
        p50Ms: percentile(durations, 50),
        p95Ms: percentile(durations, 95),
        avgTtftMs: ttfts.length > 0 ? Number((ttfts.reduce((a, b) => a + b, 0) / ttfts.length).toFixed(3)) : undefined,
        avgTtfcMs: ttfcs.length > 0 ? Number((ttfcs.reduce((a, b) => a + b, 0) / ttfcs.length).toFixed(3)) : undefined
      },
      spanStats: tracer.aggregate(),
      results
    };
  }

  public static formatMarkdown(report: EvalReport): string {
    const status = report.passedThreshold ? "PASS" : "FAIL";
    const lines = [
      `## ${report.suiteName} — ${status}`,
      ``,
      `| Metric | Value |`,
      `| :--- | :--- |`,
      `| Pass Rate | **${(report.passRate * 100).toFixed(1)}%** (${report.passedCases}/${report.totalCases}, threshold ${(report.minPassRate * 100).toFixed(1)}%) |`,
      `| Total Suite Time | ${report.totalDurationMs.toFixed(2)} ms |`,
      `| Case Latency (avg / p50 / p95) | ${report.latency.avgMs} ms / ${report.latency.p50Ms} ms / ${report.latency.p95Ms} ms |`
    ];

    if (report.latency.avgTtftMs !== undefined) {
      lines.push(`| Avg TTFT / TTFC | ${report.latency.avgTtftMs} ms / ${report.latency.avgTtfcMs ?? report.latency.avgTtftMs} ms |`);
    }

    lines.push(
      ``,
      `| Case | Status | Score | Latency | Steps | Details |`,
      `| :--- | :---: | :---: | ---: | :---: | :--- |`
    );

    for (const r of report.results) {
      const icon = r.passed ? "PASS" : "FAIL";
      const failReasons = r.scores
        .filter((s) => !s.passed && s.reason)
        .map((s) => `${s.name}: ${s.reason}`)
        .join("; ");
      lines.push(
        `| ${r.name} | ${icon} | ${(r.avgScore * 100).toFixed(0)}% | ${r.durationMs.toFixed(2)} ms | ${r.totalSteps} | ${failReasons || "OK"} |`
      );
    }

    return lines.join("\n");
  }

  public static formatJson(report: EvalReport): string {
    return JSON.stringify(report, null, 2);
  }
}
