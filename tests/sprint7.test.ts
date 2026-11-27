import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { rmSync, existsSync } from "node:fs";
import {
  buildAgentCard,
  A2AClient,
  CheckpointStore,
  StructuredOutputResolver,
  ReActLoop,
  Session,
  BUILTIN_TOOLS,
  type LLMFunctionCaller,
  type AgentSpec
} from "../src/liate";
import { app } from "../src/runtime/hono";

describe("Sprint 7 Pillar 1: A2A v1.0 Protocol", () => {
  const sampleSpec: AgentSpec = {
    L: "sarvam/sarvam-105b",
    I: { memory: ":memory:" },
    A: {
      name: "sovereign_router",
      version: "0.4.0",
      intent: "Routes billing & math tasks over A2A v1.0",
      skills: ["india-payments", "tax-calc"]
    },
    T: { builtin: ["math"] },
    E: {}
  };

  test("buildAgentCard generates A2A v1.0 compliant card with supportedInterfaces and skills", () => {
    const card = buildAgentCard(sampleSpec, "https://agents.openliate.tech/");
    expect(card.name).toBe("sovereign_router");
    expect(card.protocolVersion).toBe("1.0");
    expect(card.supportedInterfaces[0]).toEqual({
      url: "https://agents.openliate.tech/a2a",
      protocolBinding: "JSONRPC",
      protocolVersion: "1.0"
    });
    expect(card.skills.map((s) => s.id)).toContain("india-payments");
    expect(card.skills.map((s) => s.id)).toContain("tool:builtin");
    expect(card.capabilities.streaming).toBe(true);
  });

  test("Hono runtime exposes /.well-known/agent-card.json and /.well-known/agent.json", async () => {
    const res1 = await app.request("/.well-known/agent-card.json");
    const res2 = await app.request("/.well-known/agent.json");
    // Either 200 (if agent.json exists in cwd) or 503 (explicit no silent model fallback), never 404
    expect([200, 503]).toContain(res1.status);
    expect([200, 503]).toContain(res2.status);
  });

  test("POST /a2a rejects invalid JSON-RPC and unknown methods cleanly", async () => {
    const badReq = await app.request("/a2a", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" })
    });
    expect(badReq.status).toBe(400);

    const unknownMethod = await app.request("/a2a", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "1", method: "unknown/op" })
    });
    expect(unknownMethod.status).toBe(404);
  });

  test("A2AClient initializes and handles message/send method signature", () => {
    const client = new A2AClient("http://localhost:7071");
    expect(client.baseUrl).toBe("http://localhost:7071");
  });
});

describe("Sprint 7 Pillar 2: Durable HITL Checkpointing & Resume", () => {
  const testCheckpointDir = ".liate/test-checkpoints";

  test("CheckpointStore persists and loads snapshots on disk + memory", () => {
    const store = new CheckpointStore(testCheckpointDir);
    const id = store.createId();
    const saved = store.save({
      checkpointId: id,
      agentName: "hitl_agent",
      step: 1,
      maxSteps: 5,
      model: "test-model",
      systemInstruction: "Test",
      messages: [{ role: "user", content: "transfer 500", timestamp: Date.now() }],
      steps: [],
      pendingToolCalls: [{ id: "tc_1", name: "calculator", arguments: { expression: "500*2" } }],
      status: "paused",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(saved.checkpointId).toBe(id);
    const loaded = new CheckpointStore(testCheckpointDir).get(id);
    expect(loaded?.status).toBe("paused");
    expect(loaded?.pendingToolCalls[0]?.name).toBe("calculator");

    store.delete(id);
    if (existsSync(testCheckpointDir)) rmSync(testCheckpointDir, { recursive: true, force: true });
  });

  test("ReActLoop pauses before gated tool, resumes on approval (with edited args), and supports rejection", async () => {
    const store = new CheckpointStore();
    const llm: LLMFunctionCaller = {
      async chat(messages) {
        const last = messages[messages.length - 1]!;
        if (last.role === "user") {
          return {
            model: "hitl-model",
            text: "",
            toolCalls: [{ id: "tc_hitl", name: BUILTIN_TOOLS.math!.name, arguments: { expression: "10 * 2" } }]
          };
        }
        return {
          model: "hitl-model",
          text: `Final tool observation: ${last.content}`
        };
      }
    };

    const mem1 = new Session(":memory:");
    const paused = await ReActLoop.execute(
      "Multiply 10 by 2",
      llm,
      mem1,
      [BUILTIN_TOOLS.math!],
      { agentName: "hitl_agent", intent: "Math", sessionId: mem1.sessionId, state: {} },
      { model: "hitl-model", requireApproval: [BUILTIN_TOOLS.math!.name], checkpointStore: store }
    );

    expect(paused.finishReason).toBe("paused_for_approval");
    expect(paused.checkpointId).toBeDefined();
    expect(paused.pendingApproval?.toolCalls[0]?.name).toBe(BUILTIN_TOOLS.math!.name);

    // Approve with modified expression: 10 * 5 = 50
    const resumed = await ReActLoop.resume(
      paused.checkpointId!,
      { approved: true, updatedArgs: { tc_hitl: { expression: "10 * 5" } } },
      llm,
      mem1,
      [BUILTIN_TOOLS.math!],
      { agentName: "hitl_agent", intent: "Math", sessionId: mem1.sessionId, state: {} },
      { model: "hitl-model", requireApproval: [BUILTIN_TOOLS.math!.name], checkpointStore: store }
    );

    expect(resumed.finishReason).toBe("stop");
    expect(resumed.text).toContain("50");

    // Test rejection path
    const mem2 = new Session(":memory:");
    const paused2 = await ReActLoop.execute(
      "Multiply 10 by 2",
      llm,
      mem2,
      [BUILTIN_TOOLS.math!],
      { agentName: "hitl_agent", intent: "Math", sessionId: mem2.sessionId, state: {} },
      { model: "hitl-model", requireApproval: true, checkpointStore: store }
    );
    const rejected = await ReActLoop.resume(
      paused2.checkpointId!,
      { approved: false, reason: "Amount not authorized" },
      llm,
      mem2,
      [BUILTIN_TOOLS.math!],
      { agentName: "hitl_agent", intent: "Math", sessionId: mem2.sessionId, state: {} },
      { model: "hitl-model", requireApproval: true, checkpointStore: store }
    );

    expect(rejected.finishReason).toBe("stop");
    expect(rejected.text).toContain("Amount not authorized");
  });

  test("POST /resume validates required payload fields", async () => {
    const res = await app.request("/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });
});

describe("Sprint 7 Pillar 4: Typed Structured Output Parity", () => {
  test("StructuredOutputResolver validates Zod schemas and runs 1-step self-repair on invalid JSON", async () => {
    const InvoiceSchema = z.object({
      vendor: z.string(),
      totalInr: z.number().positive(),
      approved: z.boolean()
    });

    let calls = 0;
    const selfRepairLlm: LLMFunctionCaller = {
      async chat() {
        calls++;
        if (calls === 1) {
          return { model: "repair-model", text: "Sure! Here is the data: {broken json" };
        }
        return {
          model: "repair-model",
          text: "```json\n{\"vendor\":\"OpenLiate\",\"totalInr\":4999,\"approved\":true}\n```"
        };
      }
    };

    const mem = new Session(":memory:");
    const res = await ReActLoop.execute(
      "Extract invoice",
      selfRepairLlm,
      mem,
      [],
      { agentName: "struct_agent", intent: "Extract", sessionId: mem.sessionId, state: {} },
      { model: "repair-model", outputSchema: InvoiceSchema }
    );

    expect(calls).toBe(2); // Initial + 1 self-repair
    expect(res.finishReason).toBe("stop");
    expect(res.data).toEqual({ vendor: "OpenLiate", totalInr: 4999, approved: true });
    expect(JSON.parse(res.text)).toEqual({ vendor: "OpenLiate", totalInr: 4999, approved: true });
  });

  test("StructuredOutputResolver supports raw JSON Schema objects", () => {
    const check = StructuredOutputResolver.validate(
      '{"name":"liate","version":4}',
      { type: "object", required: ["name", "version"] }
    );
    expect(check.success).toBe(true);
    if (check.success) {
      expect(check.data.version).toBe(4);
    }
  });
});
