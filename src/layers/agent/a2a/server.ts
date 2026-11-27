import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { buildAgentCard } from "@/layers/agent/a2a/card";
import type { A2ATaskResult } from "@/layers/agent/a2a/client";
import type { liate } from "@/core/om";
import { randomUUID } from "node:crypto";

export interface A2AServerOptions {
  getAgent: (customSpec?: any) => Promise<liate>;
}

function extractUserText(message: any): string {
  if (!message) return "";
  if (typeof message === "string") return message;
  if (Array.isArray(message.parts)) {
    return message.parts
      .map((p: any) => ((p?.kind === "text" || p?.type === "text") && typeof p.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return typeof message.content === "string" ? message.content : "";
}

/**
 * Layer [A] A2A v1.0 (2026) Server Router
 * Exposes:
 *   - GET /.well-known/agent-card.json (A2A v1.0 primary discovery)
 *   - GET /.well-known/agent.json (legacy alias)
 *   - POST /a2a (JSON-RPC 2.0: message/send, message/stream, tasks/send, tasks/sendSubscribe, tasks/get, tasks/cancel)
 */
export function createA2ARouter(options: A2AServerOptions): Hono {
  const router = new Hono();
  const taskStore = new Map<string, A2ATaskResult>();

  const handleCard = async (c: any) => {
    try {
      const agent = await options.getAgent();
      const mod = agent.toModule();
      const reqUrl = new URL(c.req.url);
      const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`;
      return c.json(buildAgentCard(mod, baseUrl));
    } catch (err: any) {
      return c.json({ error: err?.message || "Agent unavailable" }, 503);
    }
  };

  router.get("/.well-known/agent-card.json", handleCard);
  router.get("/.well-known/agent.json", handleCard);

  router.post("/a2a", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || body.jsonrpc !== "2.0" || !body.method) {
      return c.json({
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32600, message: "Invalid JSON-RPC 2.0 request" }
      }, 400);
    }

    const rpcId = body.id ?? randomUUID();
    const params = body.params || {};
    const taskId = String(params.taskId || params.id || randomUUID());

    if (body.method === "tasks/get") {
      const existing = taskStore.get(taskId);
      if (!existing) {
        return c.json({
          jsonrpc: "2.0",
          id: rpcId,
          error: { code: -32001, message: `Task '${taskId}' not found` }
        }, 404);
      }
      return c.json({ jsonrpc: "2.0", id: rpcId, result: existing });
    }

    if (body.method === "tasks/cancel") {
      const existing = taskStore.get(taskId);
      if (!existing) {
        return c.json({
          jsonrpc: "2.0",
          id: rpcId,
          error: { code: -32001, message: `Task '${taskId}' not found` }
        }, 404);
      }
      existing.status = { state: "canceled", timestamp: new Date().toISOString() };
      taskStore.set(taskId, existing);
      return c.json({ jsonrpc: "2.0", id: rpcId, result: existing });
    }

    if (body.method === "message/stream" || body.method === "tasks/sendSubscribe") {
      const prompt = extractUserText(params.message);
      return streamSSE(c, async (stream) => {
        try {
          const agent = await options.getAgent(params.spec);
          const result = await agent.run(prompt, {
            onToken: async (chunk) => {
              await stream.writeSSE({
                event: "artifact",
                data: JSON.stringify({
                  jsonrpc: "2.0",
                  id: rpcId,
                  result: { kind: "task", id: taskId, taskId, delta: chunk }
                })
              });
            }
          });

          const taskResult: A2ATaskResult = {
            kind: "task",
            id: taskId,
            taskId,
            sessionId: params.sessionId,
            status: {
              state: result.finishReason === "paused_for_approval" ? "input-required" : "completed",
              timestamp: new Date().toISOString(),
              message: {
                role: "agent",
                parts: [{ kind: "text", text: result.text }]
              }
            },
            artifacts: [
              {
                name: "response",
                parts: result.data !== undefined
                  ? [{ kind: "text", text: result.text }, { kind: "data", data: result.data }]
                  : [{ kind: "text", text: result.text }]
              }
            ],
            metadata: {
              model: result.model,
              totalSteps: result.totalSteps,
              durationMs: result.durationMs,
              checkpointId: result.checkpointId
            }
          };
          taskStore.set(taskId, taskResult);

          await stream.writeSSE({
            event: "status",
            data: JSON.stringify({ jsonrpc: "2.0", id: rpcId, result: taskResult })
          });
        } catch (err: any) {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({
              jsonrpc: "2.0",
              id: rpcId,
              error: { code: -32000, message: err?.message || String(err) }
            })
          });
        }
      });
    }

    if (body.method === "message/send" || body.method === "tasks/send") {
      const prompt = extractUserText(params.message);
      if (!prompt) {
        return c.json({
          jsonrpc: "2.0",
          id: rpcId,
          error: { code: -32602, message: "Missing params.message text" }
        }, 400);
      }

      try {
        const agent = await options.getAgent(params.spec);
        const result = await agent.run(prompt);
        const taskResult: A2ATaskResult = {
          kind: "task",
          id: taskId,
          taskId,
          sessionId: params.sessionId,
          status: {
            state: result.finishReason === "paused_for_approval" ? "input-required" : "completed",
            timestamp: new Date().toISOString(),
            message: {
              role: "agent",
              parts: [{ kind: "text", text: result.text }]
            }
          },
          artifacts: [
            {
              name: "response",
              parts: result.data !== undefined
                ? [{ kind: "text", text: result.text }, { kind: "data", data: result.data }]
                : [{ kind: "text", text: result.text }]
            }
          ],
          metadata: {
            model: result.model,
            totalSteps: result.totalSteps,
            durationMs: result.durationMs,
            checkpointId: result.checkpointId
          }
        };
        taskStore.set(taskId, taskResult);
        return c.json({ jsonrpc: "2.0", id: rpcId, result: taskResult });
      } catch (err: any) {
        return c.json({
          jsonrpc: "2.0",
          id: rpcId,
          error: { code: -32000, message: err?.message || String(err) }
        }, 500);
      }
    }

    return c.json({
      jsonrpc: "2.0",
      id: rpcId,
      error: { code: -32601, message: `Method '${body.method}' not found` }
    }, 404);
  });

  return router;
}
