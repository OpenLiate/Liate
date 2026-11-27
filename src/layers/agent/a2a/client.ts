import type { AgentCard } from "@/layers/agent/a2a/card";
import { randomUUID } from "node:crypto";

export interface A2ATaskStatus {
  state: "submitted" | "working" | "input-required" | "completed" | "failed" | "canceled";
  timestamp: string;
  message?: {
    role: "agent";
    parts: Array<{ kind: "text"; text: string }>;
  };
}

export interface A2ATaskResult {
  kind: "task";
  id: string;
  taskId: string;
  sessionId?: string;
  status: A2ATaskStatus;
  artifacts?: Array<{
    name?: string;
    parts: Array<{ kind: "text"; text: string } | { kind: "data"; data: unknown }>;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Layer [A] A2A v1.0 (2026) Client
 * Discovers remote Agent Cards (`/.well-known/agent-card.json` with fallback to `/.well-known/agent.json`)
 * and dispatches peer-to-peer messages via JSON-RPC 2.0 `message/send`.
 */
export class A2AClient {
  public readonly baseUrl: string;
  private cachedCard?: AgentCard;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  public async fetchCard(forceRefresh = false): Promise<AgentCard> {
    if (this.cachedCard && !forceRefresh) return this.cachedCard;

    const candidates = this.baseUrl.endsWith(".json")
      ? [this.baseUrl]
      : [
          `${this.baseUrl}/.well-known/agent-card.json`,
          `${this.baseUrl}/.well-known/agent.json`
        ];

    let lastStatus = 0;
    for (const cardUrl of candidates) {
      const res = await fetch(cardUrl, { headers: { Accept: "application/json" } });
      if (res.ok) {
        this.cachedCard = (await res.json()) as AgentCard;
        return this.cachedCard;
      }
      lastStatus = res.status;
    }

    throw new Error(`[Liate A2A] Failed to fetch Agent Card from ${this.baseUrl}: HTTP ${lastStatus}`);
  }

  private async resolveEndpoint(): Promise<string> {
    if (this.baseUrl.endsWith("/a2a")) return this.baseUrl;
    try {
      const card = await this.fetchCard();
      const jsonRpcIface = card.supportedInterfaces?.find((i) => i.protocolBinding === "JSONRPC");
      if (jsonRpcIface?.url) return jsonRpcIface.url;
      if (card.url) return card.url;
    } catch {
      // Fallback to standard /a2a path on baseUrl
    }
    return `${this.baseUrl}/a2a`;
  }

  public async sendMessage(
    text: string,
    options: { taskId?: string; sessionId?: string; headers?: Record<string, string>; method?: "message/send" | "tasks/send" } = {}
  ): Promise<A2ATaskResult> {
    const endpoint = await this.resolveEndpoint();
    const taskId = options.taskId || randomUUID();

    const payload = {
      jsonrpc: "2.0",
      id: randomUUID(),
      method: options.method || "message/send",
      params: {
        id: taskId,
        sessionId: options.sessionId,
        message: {
          role: "user",
          messageId: randomUUID(),
          parts: [{ kind: "text", text }]
        }
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`[Liate A2A] ${payload.method} failed (${res.status}): ${errBody}`);
    }

    const rpc: any = await res.json();
    if (rpc.error) {
      throw new Error(`[Liate A2A] RPC Error ${rpc.error.code}: ${rpc.error.message}`);
    }
    return rpc.result as A2ATaskResult;
  }

  /** Backward-compatible alias for sendMessage */
  public async sendTask(
    text: string,
    options: { taskId?: string; sessionId?: string; headers?: Record<string, string> } = {}
  ): Promise<A2ATaskResult> {
    return this.sendMessage(text, options);
  }

  public async getTask(taskId: string): Promise<A2ATaskResult> {
    const endpoint = await this.resolveEndpoint();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: randomUUID(),
        method: "tasks/get",
        params: { id: taskId, taskId }
      })
    });
    const rpc: any = await res.json();
    if (rpc.error) {
      throw new Error(`[Liate A2A] RPC Error ${rpc.error.code}: ${rpc.error.message}`);
    }
    return rpc.result as A2ATaskResult;
  }
}
