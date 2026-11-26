import { describe, expect, test } from "bun:test";
import {
  EnvironmentResolver,
  Session,
  Lib,
  Knowledge,
  IntegrationResolver,
  resolveSessionAdapter,
  resolvePgVectorUrl,
  PineconeSource,
  ToolRegistry,
  listBuiltinTools,
  listConnectors,
  ReActLoop,
  AgentVersionControl,
  SubAgentRunner,
  AUM,
  Agent,
  LiateLlmClient,
  HubResolver,
  normalizeModelConfig,
  type AgentTool
} from "@/liate";

describe("Layers: E, I, A, L", () => {
  test("Layer [E] EnvironmentResolver masks secrets and resolves vars", () => {
    expect(EnvironmentResolver.maskSecret("sk_live_abcdef1234")).toBe("sk_l***1234");
    expect(EnvironmentResolver.maskSecret("short")).toBe("******");

    const resolved = EnvironmentResolver.resolve(
      { TOKEN: "$MY_SECRET", MODE: "prod" },
      { MY_SECRET: "secret_xyz" }
    );
    expect(resolved.TOKEN).toBe("secret_xyz");
    expect(resolved.MODE).toBe("prod");
  });

  test("Layer [I] Session manages in-memory messages and state", async () => {
    const session = new Session(":memory:");
    await session.append({ role: "user", content: "hi", timestamp: 1 });
    await session.setState("step", 42);

    expect(session.getMessages().length).toBe(1);
    expect(session.getMessages()[0].content).toBe("hi");
    expect(session.getState("step")).toBe(42);
  });

  test("Layer [I] Lib dynamically imports builtin modules as AgentTools", async () => {
    const loaded = await Lib.import("node:path");
    expect(loaded.exports.length).toBeGreaterThan(0);

    const map = new Map([["path", loaded]]);
    const tools = Lib.asTools(map);
    expect(tools.length).toBeGreaterThan(0);
  });

  test("Layer [A] ReActLoop executes tool calls and emits onStep/onToken", async () => {
    const session = new Session(":memory:");
    const stepsSeen: number[] = [];
    const tokensSeen: string[] = [];

    const addTool: AgentTool = {
      name: "add",
      description: "Add two numbers",
      execute: async (args) => String(Number(args.a) + Number(args.b))
    };

    let turn = 0;
    const mockLlm = {
      chat: async (_messages: any[], opts: any) => {
        turn++;
        if (turn === 1) {
          return {
            text: "",
            model: "mock-model",
            toolCalls: [{ id: "tc_1", name: "add", arguments: { a: 2, b: 3 } }]
          };
        }
        opts?.onToken?.("Result ");
        opts?.onToken?.("is 5");
        return {
          text: "Result is 5",
          model: "mock-model"
        };
      }
    };

    const res = await ReActLoop.execute(
      "Add 2 and 3",
      mockLlm,
      session,
      [addTool],
      { agentName: "MathAgent", intent: "Compute", state: {} },
      {
        maxSteps: 5,
        stream: true,
        onStep: (s) => stepsSeen.push(s.step),
        onToken: (t) => tokensSeen.push(t)
      }
    );

    expect(res.finishReason).toBe("stop");
    expect(res.totalSteps).toBe(2);
    expect(res.text).toBe("Result is 5");
    expect(stepsSeen).toEqual([1, 2]);
    expect(tokensSeen).toEqual(["Result ", "is 5"]);
  });

  test("Layer [L] parseSseStream decodes live SSE token & tool_call chunks", async () => {
    const ssePayload = [
      'data: {"model":"sarvam-105b","choices":[{"delta":{"reasoning_content":"Think..."}}]}\n\n',
      'data: {"model":"sarvam-105b","choices":[{"delta":{"content":"Hello "}}]}\n\n',
      'data: {"model":"sarvam-105b","choices":[{"delta":{"content":"India!"}}]}\n\n',
      'data: {"model":"sarvam-105b","usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15},"choices":[{"delta":{}}]}\n\n',
      "data: [DONE]\n\n"
    ].join("");

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      }
    });

    const fakeResponse = new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" }
    });

    const client = new LiateLlmClient("test-key");
    const tokens: string[] = [];
    const thoughts: string[] = [];

    const parsed = await (client as any).parseSseStream(
      fakeResponse,
      "sarvam-105b",
      (c: string) => tokens.push(c),
      (r: string) => thoughts.push(r)
    );

    expect(tokens).toEqual(["Hello ", "India!"]);
    expect(thoughts).toEqual(["Think..."]);
    expect(parsed.text).toBe("Hello India!");
    expect(parsed.reasoningContent).toBe("Think...");
    expect(parsed.usage?.totalTokens).toBe(15);
  });

  test("Layer [E] assertNetworkAllowed and runWithTimeout enforce sandbox", async () => {
    const blocked = EnvironmentResolver.createSandbox({}, { denyNetwork: true });
    expect(() =>
      EnvironmentResolver.assertNetworkAllowed("https://api.sarvam.ai/v2", blocked)
    ).toThrow("Network access is disabled");

    const allowlisted = EnvironmentResolver.createSandbox({}, {
      allowedDomains: ["sarvam.ai"]
    });
    expect(() =>
      EnvironmentResolver.assertNetworkAllowed("https://api.sarvam.ai/v2", allowlisted)
    ).not.toThrow();
    expect(() =>
      EnvironmentResolver.assertNetworkAllowed("https://evil.example.com", allowlisted)
    ).toThrow("not in allowedDomains");

    await expect(
      EnvironmentResolver.runWithTimeout(
        () => new Promise((r) => setTimeout(() => r("slow"), 100)),
        15,
        "SlowTask"
      )
    ).rejects.toThrow("Sandbox Timeout");
  });

  test("Layer [I] Session delegates load/save to RemoteSessionAdapter", async () => {
    let stored: any = null;
    const adapter = {
      load: async (_id: string) => stored,
      save: async (data: any) => {
        stored = data;
      }
    };

    const s1 = new Session("remote-1", { source: "neon" }, adapter);
    await s1.append({ role: "user", content: "hello remote", timestamp: 100 });
    expect(stored).not.toBeNull();
    expect(stored.messages[0].content).toBe("hello remote");

    const s2 = new Session("remote-1", {}, adapter);
    const loaded = await s2.load();
    expect(loaded.messages.length).toBe(1);
    expect(loaded.messages[0].content).toBe("hello remote");
  });

  test("Layer [A] ReActLoop enforces sandboxTimeoutMs on slow tools", async () => {
    const session = new Session(":memory:");
    const slowTool: AgentTool = {
      name: "slow_tool",
      description: "Sleeps past timeout",
      execute: async () => {
        await new Promise((r) => setTimeout(r, 120));
        return "done";
      }
    };

    let turn = 0;
    const mockLlm = {
      chat: async () => {
        turn++;
        if (turn === 1) {
          return {
            text: "",
            model: "mock-model",
            toolCalls: [{ id: "tc_slow", name: "slow_tool", arguments: {} }]
          };
        }
        return { text: "Recovered after timeout", model: "mock-model" };
      }
    };

    const res = await ReActLoop.execute(
      "Run slow tool",
      mockLlm,
      session,
      [slowTool],
      { agentName: "GuardAgent", intent: "Test timeout", state: {} },
      { maxSteps: 3, sandboxTimeoutMs: 15 }
    );

    expect(res.finishReason).toBe("stop");
    expect(res.steps[0].toolResults?.[0].result).toContain("Sandbox Timeout");
  });

  test("Layer [L] Ollama & OpenRouter 2026 gateways and slug normalization", () => {
    const orNorm = normalizeModelConfig("openrouter/anthropic/claude-sonnet-5.5");
    expect(orNorm.provider).toBe("openrouter");
    expect(orNorm.model).toBe("anthropic/claude-sonnet-5.5");

    const olNorm = normalizeModelConfig("ollama/llama3.2:latest");
    expect(olNorm.provider).toBe("ollama");
    expect(olNorm.model).toBe("llama3.2:latest");

    const orHub = HubResolver.loadLLM("openrouter");
    expect(orHub.endpoint).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(orHub.models_endpoint).toBe("https://openrouter.ai/api/v1/models");
    expect(orHub.headers["X-OpenRouter-Title"]).toBe("Liate");

    const olHub = HubResolver.loadLLM("ollama");
    expect(olHub.endpoint).toBe("http://localhost:11434/v1/chat/completions");
    expect(olHub.models_endpoint).toBe("http://localhost:11434/v1/models");
  });

  test("Layer [I] modular adapters, knowledge, and API/webhook connectors resolve cleanly", async () => {
    expect(resolveSessionAdapter(":memory:").id).toBe("in-memory");
    expect(resolveSessionAdapter("sessions/demo").id).toBe("file-json");

    const connectorIds = listConnectors().map((c) => c.id);
    expect(connectorIds).toContain("http-api");
    expect(connectorIds).toContain("webhook");

    const ctx = await Knowledge.resolve("OpenLiate uses 5 layers L I A T E.");
    expect(ctx.documents.length).toBe(1);

    const tools = await IntegrationResolver.resolveIntegrationTools({
      knowledge: "OpenLiate L I A T E spec",
      apis: {
        weather: { baseUrl: "https://api.example.com", description: "Weather API" }
      },
      webhooks: {
        alerts: { url: "https://hooks.example.com/123", description: "Alerts webhook" }
      }
    });

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("search_knowledge");
    expect(toolNames).toContain("api_weather");
    expect(toolNames).toContain("webhook_alerts");
  });

  test("Layer [A] AgentVersionControl snapshots, hashes, diffs, and rolls back without E secrets", () => {
    const vc = new AgentVersionControl(":memory:");

    const v1 = vc.commit(
      {
        L: "sarvam/sarvam-105b",
        I: { memory: ":memory:" },
        A: { name: "SupportBot", intent: "Help customers politely", maxSteps: 5 },
        T: ["time"]
      },
      { version: "0.1.0", message: "Initial Sarvam release" }
    );

    const v2 = vc.commit(
      {
        L: { default: "sarvam/sarvam-105b", fast: "groq/qwen/qwen3.8-27b" },
        I: { memory: ":memory:" },
        A: { name: "SupportBot", intent: "Help customers concisely", maxSteps: 8 },
        T: ["time", "search"]
      },
      { version: "0.2.0", message: "Upgrade to Multi-Model L" }
    );

    expect(v1.hash).toHaveLength(12);
    expect(v2.parentHash).toBe(v1.hash);
    expect((v1.spec as any).E).toBeUndefined();

    const history = vc.log("SupportBot");
    expect(history.map((h) => h.version)).toEqual(["0.1.0", "0.2.0"]);

    const diff = vc.diff("SupportBot", "0.1.0", "0.2.0");
    expect(diff.changed).toBe(true);
    expect(diff.changes.some((c) => c.layer === "L")).toBe(true);
    expect(diff.changes.some((c) => c.layer === "A" && c.field === "intent")).toBe(true);
    expect(diff.changes.some((c) => c.layer === "T")).toBe(true);

    const rolledBack = vc.checkout("SupportBot", "0.1.0");
    expect(rolledBack.spec.L).toBe("sarvam/sarvam-105b");
    expect(rolledBack.spec.A.maxSteps).toBe(5);
  });

  test("Layer [A] subAgents resolve modelTag from L cleanly without L inside A", async () => {
    const mod = AUM.parse({
      L: { default: "sarvam/sarvam-105b", fast: "groq/qwen/qwen3.8-27b" },
      A: {
        name: "Coordinator",
        intent: "Coordinate work",
        subAgents: [
          { name: "researcher", intent: "Find facts", modelTag: "fast", maxSteps: 3 },
          { name: "writer", intent: "Write prose" }
        ]
      }
    });

    expect((mod.A as any).subAgents).toHaveLength(2);
    expect((mod.A as any).subAgents[0].L).toBeUndefined();

    const agent = new Agent({
      name: "Coordinator",
      layerL: mod.L,
      subAgents: (mod.A as any).subAgents
    });
    expect(agent.getSubAgents()).toEqual(["researcher", "writer"]);

    const usedModels: string[] = [];
    const origExecute = ReActLoop.execute;
    (ReActLoop as any).execute = async (_p: any, _llm: any, _mem: any, tools: any, ctx: any, opts: any) => {
      usedModels.push(`${ctx.agentName}:${opts.model}`);
      return { text: `sub-result:${ctx.agentName}`, steps: [], totalSteps: 1, model: opts.model, durationMs: 0, finishReason: "stop" };
    };

    try {
      const rDirect = await agent.run("Research Liate", { subAgent: "researcher" });
      expect(rDirect.text).toBe("sub-result:researcher");
      expect(usedModels[0]).toBe("researcher:groq/qwen/qwen3.8-27b");

      const rWriter = await agent.run("Write summary", { subAgent: "writer" });
      expect(rWriter.text).toBe("sub-result:writer");
      expect(usedModels[1]).toBe("writer:sarvam/sarvam-105b");

      const tools = SubAgentRunner.buildTools((mod.A as any).subAgents, {
        parentName: "Coordinator",
        parentIntent: "Coordinate",
        parentVersion: "0.0.1",
        defaultMaxSteps: 5,
        tools: [],
        resolveModel: (tag?: string) => (tag === "fast" ? "groq/qwen/qwen3.8-27b" : "sarvam/sarvam-105b")
      });
      expect(tools.map((t) => t.name)).toEqual(["subagent_researcher", "subagent_writer"]);
    } finally {
      (ReActLoop as any).execute = origExecute;
    }
  });

  test("Layer [I].context flows through AUM, IntegrationResolver, and AgentContext into ReActLoop", async () => {
    const mod = AUM.parse({
      L: "groq/qwen/qwen3.8-27b",
      I: {
        memory: ":memory:",
        context: { org: "OpenLiate", region: "India" }
      },
      A: { name: "ContextAgent", intent: "Answer using org context." }
    });

    expect(mod.I?.context).toEqual({ org: "OpenLiate", region: "India" });
    const block = IntegrationResolver.formatContextBlock(mod.I?.context as any);
    expect(block).toContain("<context>");
    expect(block).toContain('"org": "OpenLiate"');

    let capturedCtx: any = null;
    const origExecute = ReActLoop.execute;
    (ReActLoop as any).execute = async (_p: any, _llm: any, _mem: any, _tools: any, ctx: any, opts: any) => {
      capturedCtx = ctx;
      return { text: "ok", steps: [], totalSteps: 1, model: opts.model, durationMs: 0, finishReason: "stop" };
    };

    try {
      const agent = new Agent({
        name: "ContextAgent",
        model: "groq/qwen/qwen3.8-27b",
        intent: "Answer using org context.",
        context: mod.I?.context as any
      });
      await agent.run("Hello", { context: { tier: "enterprise" } });
      expect(capturedCtx.intent).toContain("<context>");
      expect(capturedCtx.state.context).toEqual({
        org: "OpenLiate",
        region: "India",
        tier: "enterprise"
      });
    } finally {
      (ReActLoop as any).execute = origExecute;
    }
  });

  test("Layer [I] SQLite & Postgres adapters match URIs and persist real bun:sqlite sessions", async () => {
    expect(resolveSessionAdapter("sqlite://.liate/test.db").id).toBe("sqlite");
    expect(resolveSessionAdapter("libsql://demo.turso.io#u1").id).toBe("sqlite");
    expect(resolveSessionAdapter("postgresql://localhost:5432/liate#s1").id).toBe("postgres");
    expect(resolveSessionAdapter("neon://session_abc").id).toBe("postgres");
    expect(resolveSessionAdapter("supabase://session_xyz").id).toBe("postgres");

    const fs = await import("node:fs");
    const dbFile = "temp/test-memory-suite.db";
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);

    const s1 = new Session(`sqlite://${dbFile}#user_42`);
    await s1.append({ role: "user", content: "hello sqlite", timestamp: 1 });
    await s1.setState("plan", "pro");

    const s2 = new Session(`sqlite://${dbFile}#user_42`);
    const loaded = await s2.load();
    expect(loaded.sessionId).toBe("user_42");
    expect(loaded.messages.length).toBe(1);
    expect(loaded.messages[0].content).toBe("hello sqlite");
    expect(loaded.state.plan).toBe("pro");

    await s1.close();
    await s2.close();
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  });

  test("Layer [I] 2026 pgvector URL resolution and Pinecone REST 2026-07 upsert/query work cleanly", async () => {
    process.env.NEON_DATABASE_URL = "postgresql://neon-host/neondb";
    process.env.SUPABASE_DB_URL = "postgresql://supabase-host/postgres";
    expect(resolvePgVectorUrl("neon")).toBe("postgresql://neon-host/neondb");
    expect(resolvePgVectorUrl("supabase")).toBe("postgresql://supabase-host/postgres");
    expect(resolvePgVectorUrl("postgresql://127.0.0.1:5432/liate")).toBe("postgresql://127.0.0.1:5432/liate");

    const tool = await IntegrationResolver.resolveKnowledgeTool({
      knowledge: { vector: "neon", embedModel: "sarvam/embeddinggemma-2", topK: 3 }
    });
    expect(tool?.name).toBe("search_knowledge");

    const seenHeaders: any[] = [];
    const srv = Bun.serve({
      port: 0,
      async fetch(req) {
        const url = new URL(req.url);
        seenHeaders.push({
          path: url.pathname,
          apiKey: req.headers.get("api-key"),
          apiVersion: req.headers.get("x-pinecone-api-version")
        });
        if (url.pathname === "/vectors/upsert") {
          return Response.json({ upsertedCount: 1 });
        }
        return Response.json({
          matches: [
            { id: "doc1", score: 0.96, metadata: { source: "docs/rag.md", content: "LIATE 2026 RAG" } }
          ]
        });
      }
    });

    try {
      // Override https->http via custom fetch test or verify PineconeSource headers on local HTTP
      const origFetch = globalThis.fetch;
      globalThis.fetch = ((input: any, init: any) => {
        const target = String(input).replace("https://", "http://");
        return origFetch(target, init);
      }) as any;

      try {
        const pc = new PineconeSource({
          vector: "pinecone",
          embedModel: "sarvam/embeddinggemma-2",
          indexHost: `127.0.0.1:${srv.port}`,
          apiKey: "pcsk_test_2026",
          namespace: "prod"
        });
        const count = await pc.upsert(
          [{ id: "doc1", source: "docs/rag.md", content: "LIATE 2026 RAG" }],
          [[0.1, 0.2, 0.3]]
        );
        expect(count).toBe(1);

        const hits = await pc.query("LIATE RAG", [0.1, 0.2, 0.3]);
        expect(hits).toHaveLength(1);
        expect(hits[0].score).toBe(0.96);
        expect(seenHeaders[0].apiVersion).toBe("2026-07");
        expect(seenHeaders[0].apiKey).toBe("pcsk_test_2026");
      } finally {
        globalThis.fetch = origFetch;
      }
    } finally {
      srv.stop();
    }
  });

  test("Layer [T] resolves builtin tools, API tools, and inline MCP v2 tools together", async () => {
    expect(listBuiltinTools()).toContain("datetime");
    expect(listBuiltinTools()).toContain("math");

    const srv = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        return Response.json({ path: url.pathname, auth: req.headers.get("authorization") });
      }
    });

    try {
      const tools = await ToolRegistry.resolveTools(
        [
          "builtin:datetime",
          "builtin:math",
          {
            type: "api",
            name: "user_lookup",
            description: "Lookup user by ID",
            method: "GET",
            url: `http://127.0.0.1:${srv.port}/users/{userId}`,
            headers: { Authorization: "Bearer $DEMO_KEY" }
          },
          {
            type: "mcp-inline",
            name: "local-mcp",
            tools: [
              {
                name: "greet",
                description: "Greet someone",
                parameters: {
                  type: "object",
                  properties: { name: { type: "string" } },
                  required: ["name"]
                },
                execute: async (a: any) => `Namaste, ${a.name}!`
              }
            ]
          }
        ],
        { DEMO_KEY: "tok_abc" }
      );

      expect(tools.map((t) => t.name)).toEqual(["datetime", "math", "user_lookup", "greet"]);

      const mathOut = JSON.parse(String(await tools[1].execute({ expression: "(10 + 5) * 2" })));
      expect(mathOut.result).toBe(30);

      const apiOut = JSON.parse(String(await tools[2].execute({ userId: "u_99" })));
      expect(apiOut.path).toBe("/users/u_99");
      expect(apiOut.auth).toBe("Bearer tok_abc");

      const mcpOut = await tools[3].execute({ name: "Vinod" });
      expect(mcpOut).toBe("Namaste, Vinod!");
    } finally {
      srv.stop();
    }
  });
});
