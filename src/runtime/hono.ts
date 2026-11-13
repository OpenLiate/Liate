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
import { skillsRouter } from "@/routes/skills";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

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
async function getOrLoadAgent(customSpec?: any, customPath?: string): Promise<liate> {
  if (customSpec) {
    return liate.from(customSpec);
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

  // Ephemeral fallback agent if no agent.json is present
  return liate.from({
    L: "sarvam/sarvam-105b-conversations",
    A: { name: "liate-edge-agent", intent: "Sovereign Indic Edge Agent Runtime" },
    E: { SARVAM_API_KEY: "$SARVAM_API_KEY" }
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
 * 2. POST /run
 * Standard single-shot autonomous agent invocation
 * Body: { input: string, spec?: any, path?: string, options?: any }
 */
app.post("/run", async (c) => {
  const start = Date.now();
  try {
    const body = await c.req.json();
    const input = body.input;

    if (!input || typeof input !== "string") {
      return c.json({
        success: false,
        error: "Missing or invalid 'input' parameter in request body"
      }, 400);
    }

    const agent = await getOrLoadAgent(body.spec, body.path);
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

    const agent = await getOrLoadAgent(body.spec, body.path);
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

  const input = body.input || body.message;
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

      const agent = await getOrLoadAgent(body.spec, body.path);
      const result = await agent.run(input, body.options);

      // Stream out intermediate ReAct reasoning steps
      if (result.steps && result.steps.length > 0) {
        for (const step of result.steps) {
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
