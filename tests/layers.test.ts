import { describe, expect, test } from "bun:test";
import {
  EnvironmentResolver,
  Session,
  Lib,
  ReActLoop,
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
});
