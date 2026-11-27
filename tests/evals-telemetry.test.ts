import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  Tracer,
  aggregateSpans,
  EvalRunner,
  Scorers,
  ReActLoop,
  Session,
  BUILTIN_TOOLS,
  type LLMFunctionCaller
} from "../src/liate";

describe("Telemetry Tracer & Span Aggregation", () => {
  test("records spans, TTFT, TTFC, and computes p50/p95/p99 stats", () => {
    const tracer = new Tracer("liate-test");
    for (let i = 0; i < 10; i++) {
      const s = tracer.startSpan("llm.chat", { kind: "llm", attributes: { model: "sarvam-105b" } });
      s.markFirstChunk();
      s.markFirstToken();
      s.end("ok");
    }
    const errSpan = tracer.startSpan("llm.chat", { kind: "llm" });
    errSpan.end("error", "timeout");

    const stats = tracer.aggregate()["llm.chat"]!;
    expect(stats.count).toBe(11);
    expect(stats.errorCount).toBe(1);
    expect(stats.p50Ms).toBeGreaterThanOrEqual(0);
    expect(stats.p95Ms).toBeGreaterThanOrEqual(stats.p50Ms);
    expect(stats.avgTtftMs).toBeGreaterThanOrEqual(0);
    expect(stats.avgTtfcMs).toBeGreaterThanOrEqual(0);

    const otlp = tracer.toOtlpJson();
    expect(otlp.resourceSpans[0]!.scopeSpans[0]!.spans.length).toBe(11);
  });

  test("aggregateSpans handles empty array safely", () => {
    expect(aggregateSpans([])).toEqual({});
  });
});

describe("Built-in Scorers & EvalRunner", () => {
  const mockLlm: LLMFunctionCaller = {
    async chat(messages, options) {
      const last = messages[messages.length - 1]!;
      if (last.role === "user" && last.content.includes("2+2")) {
        return {
          model: "test-model",
          text: "",
          toolCalls: [{ id: "tc1", name: "calculator", arguments: { expression: "2+2" } }]
        };
      }
      const toolMsg = [...messages].reverse().find((m) => m.role === "tool");
      const out = toolMsg ? JSON.stringify({ result: 4 }) : "Hello Liate";
      options?.onToken?.(out);
      return { model: "test-model", text: out };
    }
  };

  test("evaluates tool calls, Zod schema, latency budget, and generates Markdown report", async () => {
    const ResultSchema = z.object({ result: z.number() });

    const report = await EvalRunner.run(
      async (prompt, opts) => {
        const mem = new Session(":memory:");
        return ReActLoop.execute(
          prompt,
          mockLlm,
          mem,
          [BUILTIN_TOOLS.math!],
          { agentName: "eval_agent", intent: "Test", sessionId: mem.sessionId, state: {} },
          { ...(opts || {}), model: "test-model" }
        );
      },
      [
        {
          id: "c1",
          name: "Math + Schema",
          input: "Compute 2+2",
          scorers: [
            Scorers.toolCallMatch(["calculator"]),
            Scorers.jsonSchema(ResultSchema),
            Scorers.latencyBudget(500)
          ]
        },
        {
          id: "c2",
          name: "Greeting",
          input: "Say hi",
          expected: "Hello Liate",
          scorers: [Scorers.exactMatch(), Scorers.regex(/Liate/)]
        }
      ],
      { suiteName: "Test Eval Suite", concurrency: 2, minPassRate: 1.0 }
    );

    expect(report.passedThreshold).toBe(true);
    expect(report.passedCases).toBe(2);
    expect(report.passRate).toBe(1);
    expect(report.latency.avgTtftMs).toBeGreaterThanOrEqual(0);

    const md = EvalRunner.formatMarkdown(report);
    expect(md).toContain("Test Eval Suite — PASS");
    expect(md).toContain("Math + Schema");
  });

  test("marks suite failed when below minPassRate", async () => {
    const report = await EvalRunner.run(
      async () => ({
        text: "wrong",
        steps: [],
        totalSteps: 1,
        model: "m",
        durationMs: 1,
        finishReason: "stop"
      }),
      [{ input: "test", expected: "expected", scorers: [Scorers.exactMatch()] }],
      { minPassRate: 1.0 }
    );

    expect(report.passedThreshold).toBe(false);
    expect(report.failedCases).toBe(1);
  });
});
