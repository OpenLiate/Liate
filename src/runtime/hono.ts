// src/runtime/hono.ts
// Liate v0.0.7 — Edge Runtime Server
// Endpoints: /health, /run, /chat, /stream

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import { liate } from "@/core/om";
import { VERSION } from "@/core/version";
import { Session } from "@/layers/integration/memory";
import { LLMRouter } from "@/layers/llm/model";
import { skillsRouter } from "@/routes/skills";
import { listLocalHubAgents } from "@/cli/resolver";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

export const app = new Hono();

// Global Middleware
app.use("*", cors());
app.use("*", logger());
app.route("/skills", skillsRouter);

// Active agent and session cache
let activeAgent: liate | null = null;
const activeSessions = new Map<string, Session>();
const defaultSpecPath = resolve(process.cwd(), "agent.json");

/**
 * Resolves or lazily loads the target agent
 */
async function getOrLoadAgent(
  customSpec?: any,
  customPath?: string,
  resolvedKeys?: Record<string, string>
): Promise<liate> {
  if (customSpec) {
    const specCopy = typeof customSpec === "object" ? { ...customSpec } : customSpec;
    if (resolvedKeys && typeof resolvedKeys === "object" && typeof specCopy === "object") {
      specCopy.E = { ...(specCopy.E || {}), ...resolvedKeys };
    }
    return liate.from(specCopy);
  }

  const targetPath = customPath ? resolve(process.cwd(), customPath) : defaultSpecPath;

  if (activeAgent && !customPath) {
    return activeAgent;
  }

  if (existsSync(targetPath)) {
    const loaded = await liate.load(targetPath);
    if (!customPath) {
      activeAgent = loaded;
    }
    return loaded;
  }

  // Ephemeral agent using explicit LIATE_MODEL env var (never hardcoded)
  const envModel = process.env.LIATE_MODEL?.trim();
  if (!envModel) {
    throw new Error(
      "No agent.json found and LIATE_MODEL is not set. Pass 'spec'/'module' or 'path' in request body, or set LIATE_MODEL."
    );
  }
  return liate.from({
    L: envModel,
    A: { name: "liate-edge-agent", intent: "Sovereign Edge Agent Runtime" },
    E: {}
  });
}

/**
 * 1. GET /health
 * Fast liveness probe: uptime, memory, and engine readiness
 */
app.get("/health", (c) => {
  const mem = typeof process !== "undefined" && process.memoryUsage ? process.memoryUsage() : null;
  return c.json({
    status: "ok",
    framework: "Liate",
    version: VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: mem ? {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024)
    } : undefined
  });
});

/**
 * GET /models, /v1/models, /api/v1/models
 * Live dynamic model discovery from Sarvam AI, Neon AI Gateway, and Gnani AI.
 * Zero hardcoded models.
 */
const handleGetModels = async (c: any) => {
  const provider = c.req.query("provider");
  const models = await LLMRouter.listModels(provider);
  return c.json({
    object: "list",
    data: models
  });
};

app.get("/models", handleGetModels);
app.get("/v1/models", handleGetModels);
app.get("/api/v1/models", handleGetModels);

/**
 * GET /hub & GET /hub/agents
 * Lists all sovereign agent templates in the local agent hub
 */
app.get("/hub", (c) => {
  const agents = listLocalHubAgents();
  return c.json({
    success: true,
    count: agents.length,
    agents
  });
});

app.get("/hub/agents", (c) => {
  const agents = listLocalHubAgents();
  return c.json({
    success: true,
    count: agents.length,
    agents
  });
});

/**
 * GET /hub/agents/:id
 * Retrieves the full specification of a local hub agent template
 */
app.get("/hub/agents/:id", (c) => {
  const id = c.req.param("id");
  const hubCandidate = resolve(process.cwd(), "hub", "agents", id, "agent.json");

  if (!existsSync(hubCandidate)) {
    return c.json({
      success: false,
      error: `Hub agent '${id}' not found`
    }, 404);
  }

  try {
    const raw = JSON.parse(readFileSync(hubCandidate, "utf-8"));
    return c.json({
      success: true,
      id,
      spec: raw
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: `Failed to parse agent spec for '${id}': ${err.message}`
    }, 500);
  }
});

/**
 * 2. POST /run
 * Standard single-shot autonomous agent invocation
 * Body: { input: string, spec?: any, path?: string, options?: any }
 */
app.post("/run", async (c) => {
  const start = Date.now();
  try {
    const body = await c.req.json();
    const input = body.input || body.prompt;
    const spec = body.spec || body.module;

    if (!input || typeof input !== "string") {
      return c.json({
        success: false,
        error: "Missing or invalid 'input' parameter in request body"
      }, 400);
    }

    const agent = await getOrLoadAgent(spec, body.path, body.keys);
    const result = await agent.run(input, body.options);

    return c.json({
      success: true,
      output: result.text,
      thought: result.thought,
      steps: result.steps,
      totalSteps: result.totalSteps,
      model: result.model,
      durationMs: Date.now() - start
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: err.message || "Agent execution failed",
      durationMs: Date.now() - start
    }, 500);
  }
});

/**
 * 3. POST /chat
 * Multi-turn conversational endpoint preserving session memory
 * Body: { message: string, sessionId?: string, spec?: any, path?: string }
 */
app.post("/chat", async (c) => {
  const start = Date.now();
  try {
    const body = await c.req.json();
    const message = body.message || body.input;
    const sessionId = body.sessionId || "default-session";

    if (!message || typeof message !== "string") {
      return c.json({
        success: false,
        error: "Missing or invalid 'message' parameter in request body"
      }, 400);
    }

    // Retrieve or initialize session memory
    let memory = activeSessions.get(sessionId);
    if (!memory) {
      memory = new Session(sessionId);
      activeSessions.set(sessionId, memory);
    }

    const agent = await getOrLoadAgent(body.spec || body.module, body.path, body.keys);
    const runner = await agent.getRunner();

    // Attach session memory for multi-turn history
    (runner as any).memory = memory;

    const result = await agent.run(message, body.options);

    return c.json({
      success: true,
      sessionId,
      reply: result.text,
      thought: result.thought,
      steps: result.totalSteps,
      durationMs: Date.now() - start
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: err.message || "Chat turn failed",
      durationMs: Date.now() - start
    }, 500);
  }
});

/**
 * 4. POST /stream
 * Real-time Server-Sent Events (SSE) streaming
 * Body: { input: string, sessionId?: string, spec?: any, path?: string }
 */
app.post("/stream", async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const input = body.input || body.message || body.prompt;
  if (!input || typeof input !== "string") {
    return c.json({ success: false, error: "Missing 'input' parameter" }, 400);
  }

  return streamSSE(c, async (stream) => {
    const start = Date.now();
    try {
      await stream.writeSSE({
        event: "start",
        data: JSON.stringify({
          status: "started",
          timestamp: new Date().toISOString()
        })
      });

      const agent = await getOrLoadAgent(body.spec || body.module, body.path, body.keys);
      const streamedSteps = new Set<number>();

      const result = await agent.run(input, {
        ...(body.options || {}),
        stream: true,
        onToken: async (chunk: string) => {
          await stream.writeSSE({
            event: "token",
            data: JSON.stringify({ text: chunk })
          });
        },
        onStep: async (step) => {
          streamedSteps.add(step.step);
          await stream.writeSSE({
            event: "step",
            data: JSON.stringify({
              step: step.step,
              thought: step.thought,
              toolCalls: step.toolCalls?.map(t => t.name),
              toolResults: step.toolResults?.map(r => ({ tool: r.toolName, result: r.result }))
            })
          });
        }
      });

      // Emit any steps not already streamed
      if (result.steps && result.steps.length > 0) {
        for (const step of result.steps) {
          if (streamedSteps.has(step.step)) continue;
          await stream.writeSSE({
            event: "step",
            data: JSON.stringify({
              step: step.step,
              thought: step.thought,
              toolCalls: step.toolCalls?.map(t => t.name),
              toolResults: step.toolResults?.map(r => ({ tool: r.toolName, result: r.result }))
            })
          });
        }
      }

      // Stream out the final answer
      await stream.writeSSE({
        event: "message",
        data: JSON.stringify({
          text: result.text,
          thought: result.thought
        })
      });

      // Stream completion
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({
          totalSteps: result.totalSteps,
          durationMs: Date.now() - start,
          model: result.model
        })
      });
    } catch (err: any) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: err.message || "Streaming failed" })
      });
    }
  });
});

// Port configuration
const PORT = Number(process.env.PORT || 7071);

/**
 * Starts the HTTP server on specified port (Bun or Node)
 */
export function startServer(port: number = PORT) {
  if (typeof Bun !== "undefined") {
    Bun.serve({
      port,
      fetch: app.fetch
    });
    console.log(`🚀 [Liate] Edge Runtime server active at http://localhost:${port} (Bun)`);
  } else {
    import("@hono/node-server").then(({ serve }) => {
      serve({
        fetch: app.fetch,
        port
      }, (info) => {
        console.log(`🚀 [Liate] Edge Runtime server active at http://localhost:${info.port} (Node)`);
      });
    });
  }
}

// Auto-start if executed directly as entrypoint
if (typeof Bun !== "undefined" && import.meta.main) {
  startServer(PORT);
}

export default {
  port: PORT,
  fetch: app.fetch
};
