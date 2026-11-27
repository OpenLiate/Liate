import { describe, expect, it } from "bun:test";
import {
  AUM,
  Agent,
  liate,
  DurableRunStore,
  CronScheduler,
  parseCron,
  getNextRun,
  matchesCron
} from "../src/liate";
import { app } from "../src/runtime/hono";

describe("Core Robustness: Durable Execution, Workflows & Cron", () => {
  it("AUM.parse accepts Layer [A].durable, workflow, and schedule on JSON and OOP classes", () => {
    const mod = AUM.parse({
      L: "sarvam/sarvam-105b",
      A: {
        name: "robust-worker",
        durable: ":memory:",
        schedule: { cron: "*/5 * * * *", prompt: "Check health" },
        workflow: [
          { id: "step1", type: "tool", tool: "echo", args: { msg: "{{input}}" } }
        ]
      }
    });

    expect(mod.A.durable).toBe(":memory:");
    expect(mod.A.workflow?.length).toBe(1);
    expect((mod.A.schedule as any).cron).toBe("*/5 * * * *");

    class OopWorkflowAgent extends liate {
      L = "sarvam/sarvam-105b";
      A = {
        name: "oop-workflow-agent",
        durable: ":memory:",
        schedule: "@hourly",
        workflow: [{ id: "echo", type: "tool", tool: "ping" }]
      };
    }
    const oopMod = new OopWorkflowAgent().toModule();
    expect(oopMod.A.name).toBe("oop-workflow-agent");
    expect(oopMod.A.schedule).toBe("@hourly");
  });

  it("WorkflowRunner executes sequence, parallel, branch, sleep, and template interpolation", async () => {
    const callLog: string[] = [];

    const agent = new Agent({
      name: "pipeline-agent",
      model: "sarvam/sarvam-105b",
      durable: ":memory:",
      tools: [
        {
          name: "upper",
          description: "Uppercases text",
          execute: async ({ text }) => {
            callLog.push(`upper:${text}`);
            return String(text).toUpperCase();
          }
        },
        {
          name: "suffix",
          description: "Appends suffix",
          execute: async ({ text, tag }) => {
            callLog.push(`suffix:${text}`);
            return `${text}_${tag}`;
          }
        },
        {
          name: "branch_ok",
          description: "Branch target",
          execute: async ({ val }) => {
            callLog.push(`branch:${val}`);
            return `DONE:${val}`;
          }
        }
      ],
      workflow: [
        { id: "s1", type: "tool", tool: "upper", args: { text: "{{input}}" } },
        {
          id: "p1",
          type: "parallel",
          steps: [
            { id: "a", type: "tool", tool: "suffix", args: { text: "{{steps.s1.text}}", tag: "A" } },
            { id: "b", type: "tool", tool: "suffix", args: { text: "{{steps.s1.text}}", tag: "B" } }
          ]
        },
        { id: "nap", type: "sleep", sleepMs: 5 },
        {
          id: "decide",
          type: "branch",
          condition: ({ steps }) => (steps.s1.text === "HELLO" ? "matched" : "other"),
          cases: {
            matched: [
              { id: "final", type: "tool", tool: "branch_ok", args: { val: "{{steps.s1.text}}" } }
            ]
          }
        }
      ]
    });

    const res = await agent.run("hello");
    expect(res.finishReason).toBe("stop");
    expect(res.text).toBe("DONE:HELLO");
    expect(callLog).toContain("upper:hello");
    expect(callLog).toContain("suffix:HELLO");
    expect(callLog).toContain("branch:HELLO");
  });

  it("DurableRunStore checkpoints steps and resumes crashed workflows idempotently", async () => {
    const store = new DurableRunStore(":memory:");
    let step1Executions = 0;
    let step2Attempts = 0;

    const agent = new Agent({
      name: "durable-crash-agent",
      model: "sarvam/sarvam-105b",
      tools: [
        {
          name: "fetch_data",
          description: "Step 1",
          execute: async ({ q }) => {
            step1Executions++;
            return `fetched:${q}`;
          }
        },
        {
          name: "flaky_transform",
          description: "Step 2 fails on first run, succeeds on resume",
          execute: async ({ data }) => {
            step2Attempts++;
            if (step2Attempts === 1) {
              throw new Error("Simulated crash mid-workflow");
            }
            return `transformed:${data}`;
          }
        }
      ],
      workflow: [
        { id: "fetch", type: "tool", tool: "fetch_data", args: { q: "{{input}}" } },
        { id: "transform", type: "tool", tool: "flaky_transform", args: { data: "{{prev}}" } }
      ]
    });

    // Inject shared in-memory store via internal field for test determinism
    (agent as any).durableStore = store;

    let failed = false;
    try {
      await agent.runWorkflow("orders", { durable: true, runId: "run_crash_1" });
    } catch (err: any) {
      failed = true;
      expect(err.message).toContain("Simulated crash");
    }
    expect(failed).toBe(true);
    expect(step1Executions).toBe(1);

    const crashedRecord = await store.getRun("run_crash_1");
    expect(crashedRecord?.status).toBe("failed");
    expect(crashedRecord?.stepOutputs["fetch"]?.output).toBe("fetched:orders");

    // Resume the exact same runId: step 1 MUST NOT re-execute
    const resumed = await agent.resumeWorkflow("run_crash_1");
    expect(resumed.text).toBe("transformed:fetched:orders");
    expect(step1Executions).toBe(1);
    expect(step2Attempts).toBe(2);

    const completedRecord = await store.getRun("run_crash_1");
    expect(completedRecord?.status).toBe("completed");
    store.close();
  });

  it("CronScheduler parses cron expressions, enforces concurrency, and persists runs in SQLite", async () => {
    const parsed = parseCron("*/5 * * * *");
    expect(parsed.kind).toBe("cron");
    expect(parsed.minutes?.has(0)).toBe(true);
    expect(parsed.minutes?.has(15)).toBe(true);
    expect(parsed.minutes?.has(7)).toBe(false);

    const sampleDate = new Date("2026-11-27T10:05:00.000Z");
    expect(matchesCron("5 10 * * *", sampleDate)).toBe(true);
    const next = getNextRun("*/10 * * * *", sampleDate);
    expect(next.toISOString()).toBe("2026-11-27T10:10:00.000Z");

    expect(() => parseCron("invalid cron")).toThrow();

    const store = new DurableRunStore(":memory:");
    const scheduler = new CronScheduler(store);
    let runs = 0;

    await scheduler.register(
      "cron-test-agent",
      { id: "job_fast", cron: "@every 10ms", prompt: "ping", maxConcurrentRuns: 1 },
      async (prompt) => {
        runs++;
        return {
          text: `ok:${prompt}`,
          steps: [],
          totalSteps: 1,
          model: "test",
          durationMs: 1,
          finishReason: "stop"
        };
      }
    );

    const res = await scheduler.triggerNow("job_fast");
    expect(res.status).toBe("success");
    expect(runs).toBe(1);

    const jobs = await scheduler.listJobs("cron-test-agent");
    expect(jobs.length).toBe(1);
    expect(jobs[0].runCount).toBe(1);
    expect(jobs[0].lastStatus).toBe("success");

    await new Promise((r) => setTimeout(r, 20));
    const fired = await scheduler.tickOnce();
    expect(fired).toEqual(["job_fast"]);
    expect(runs).toBe(2);

    scheduler.close();
  });

  it("Hono runtime exposes GET /cron and validates POST /workflow/resume", async () => {
    const cronRes = await app.request("/cron");
    expect(cronRes.status).toBe(200);
    const cronJson = await cronRes.json();
    expect(cronJson.success).toBe(true);

    const resumeRes = await app.request("/workflow/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    expect(resumeRes.status).toBe(400);
  });
});
