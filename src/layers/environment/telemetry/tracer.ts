/**
 * Layer [E] Environment Telemetry — Zero-dependency OpenTelemetry-compatible Tracer
 * Tracks W3C trace/span IDs, TTFT (Time to First Token), TTFC (Time to First Chunk),
 * per-span p50/p95/p99 latency aggregation, and optional OTLP/HTTP JSON export.
 */

import { randomBytes } from "node:crypto";

export type SpanKind = "agent" | "llm" | "tool" | "eval" | "internal";

export interface SpanRecord {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: SpanKind;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  status: "ok" | "error";
  errorMessage?: string;
  ttftMs?: number;
  ttfcMs?: number;
  attributes: Record<string, string | number | boolean>;
}

export interface SpanAggregateStats {
  name: string;
  count: number;
  errorCount: number;
  errorRate: number;
  minMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  avgTtftMs?: number;
  avgTtfcMs?: number;
}

export interface ActiveSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: SpanKind;
  startTimeMs: number;
  startPerf: number;
  attributes: Record<string, string | number | boolean>;
  ttftMs?: number;
  ttfcMs?: number;
  markFirstChunk: () => void;
  markFirstToken: () => void;
  setAttribute: (key: string, value: string | number | boolean) => void;
  end: (status?: "ok" | "error", errorMessage?: string) => SpanRecord;
}

function genHexId(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return Number(sorted[idx]!.toFixed(3));
}

export function aggregateSpans(spans: SpanRecord[]): Record<string, SpanAggregateStats> {
  const groups = new Map<string, SpanRecord[]>();
  for (const s of spans) {
    const arr = groups.get(s.name) || [];
    arr.push(s);
    groups.set(s.name, arr);
  }

  const out: Record<string, SpanAggregateStats> = {};
  for (const [name, list] of groups.entries()) {
    const durations = list.map((s) => s.durationMs).sort((a, b) => a - b);
    const total = durations.reduce((acc, v) => acc + v, 0);
    const errors = list.filter((s) => s.status === "error").length;

    const ttfts = list.map((s) => s.ttftMs).filter((v): v is number => typeof v === "number");
    const ttfcs = list.map((s) => s.ttfcMs).filter((v): v is number => typeof v === "number");

    out[name] = {
      name,
      count: list.length,
      errorCount: errors,
      errorRate: Number((errors / list.length).toFixed(4)),
      minMs: Number((durations[0] ?? 0).toFixed(3)),
      avgMs: Number((total / list.length).toFixed(3)),
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
      maxMs: Number((durations[durations.length - 1] ?? 0).toFixed(3)),
      avgTtftMs: ttfts.length > 0 ? Number((ttfts.reduce((a, b) => a + b, 0) / ttfts.length).toFixed(3)) : undefined,
      avgTtfcMs: ttfcs.length > 0 ? Number((ttfcs.reduce((a, b) => a + b, 0) / ttfcs.length).toFixed(3)) : undefined
    };
  }
  return out;
}

export class Tracer {
  public readonly serviceName: string;
  private spans: SpanRecord[] = [];

  constructor(serviceName = "openliate-liate") {
    this.serviceName = serviceName;
  }

  public startSpan(
    name: string,
    options: {
      kind?: SpanKind;
      traceId?: string;
      parentSpanId?: string;
      attributes?: Record<string, string | number | boolean>;
    } = {}
  ): ActiveSpan {
    const traceId = options.traceId || genHexId(16);
    const spanId = genHexId(8);
    const kind = options.kind || "internal";
    const startTimeMs = Date.now();
    const startPerf = performance.now();
    const attributes: Record<string, string | number | boolean> = {
      ...(options.attributes || {})
    };

    let ttftMs: number | undefined;
    let ttfcMs: number | undefined;
    let ended = false;

    const active: ActiveSpan = {
      traceId,
      spanId,
      parentSpanId: options.parentSpanId,
      name,
      kind,
      startTimeMs,
      startPerf,
      attributes,
      markFirstChunk: () => {
        if (ttfcMs === undefined) {
          ttfcMs = Number((performance.now() - startPerf).toFixed(3));
          active.ttfcMs = ttfcMs;
        }
      },
      markFirstToken: () => {
        if (ttftMs === undefined) {
          ttftMs = Number((performance.now() - startPerf).toFixed(3));
          active.ttftMs = ttftMs;
        }
        if (ttfcMs === undefined) {
          ttfcMs = ttftMs;
          active.ttfcMs = ttfcMs;
        }
      },
      setAttribute: (key, value) => {
        attributes[key] = value;
      },
      end: (status = "ok", errorMessage) => {
        if (ended) {
          const existing = this.spans.find((s) => s.spanId === spanId);
          if (existing) return existing;
        }
        ended = true;
        const durationMs = Number((performance.now() - startPerf).toFixed(3));
        const endTimeMs = Math.round(startTimeMs + durationMs);
        const record: SpanRecord = {
          traceId,
          spanId,
          parentSpanId: options.parentSpanId,
          name,
          kind,
          startTimeMs,
          endTimeMs,
          durationMs,
          status,
          errorMessage,
          ttftMs,
          ttfcMs,
          attributes
        };
        this.spans.push(record);
        return record;
      }
    };

    return active;
  }

  public getSpans(): SpanRecord[] {
    return [...this.spans];
  }

  public aggregate(): Record<string, SpanAggregateStats> {
    return aggregateSpans(this.spans);
  }

  public clear(): void {
    this.spans = [];
  }

  /**
   * Builds an OpenTelemetry OTLP/HTTP JSON payload (ExportTraceServiceRequest).
   */
  public toOtlpJson() {
    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: this.serviceName } }
            ]
          },
          scopeSpans: [
            {
              scope: { name: "@openliate/liate", version: "0.3.0" },
              spans: this.spans.map((s) => ({
                traceId: s.traceId,
                spanId: s.spanId,
                parentSpanId: s.parentSpanId || "",
                name: s.name,
                kind: s.kind === "llm" || s.kind === "tool" ? 3 : 1,
                startTimeUnixNano: String(s.startTimeMs * 1_000_000),
                endTimeUnixNano: String(s.endTimeMs * 1_000_000),
                status: { code: s.status === "ok" ? 1 : 2, message: s.errorMessage || "" },
                attributes: Object.entries({
                  ...s.attributes,
                  ...(s.ttftMs !== undefined ? { "liate.ttft_ms": s.ttftMs } : {}),
                  ...(s.ttfcMs !== undefined ? { "liate.ttfc_ms": s.ttfcMs } : {})
                }).map(([key, val]) => ({
                  key,
                  value:
                    typeof val === "number"
                      ? { doubleValue: val }
                      : typeof val === "boolean"
                        ? { boolValue: val }
                        : { stringValue: String(val) }
                }))
              }))
            }
          ]
        }
      ]
    };
  }

  /**
   * Exports recorded spans to an OTLP/HTTP JSON endpoint (e.g. http://localhost:4318/v1/traces).
   */
  public async exportOtlp(
    endpoint: string,
    headers: Record<string, string> = {}
  ): Promise<{ ok: boolean; status: number }> {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify(this.toOtlpJson())
    });
    return { ok: res.ok, status: res.status };
  }
}
