import fs from "fs/promises";
import path from "path";
import type { AgentMessage, MemoryProvider, RemoteSessionAdapter, SessionData } from "@/layers/integration/types";
import { resolveSessionAdapter } from "@/layers/integration/memory/adapters/registry";

/**
 * Unified Session Manager for Layer [I]
 * Operates in-memory by default, auto-persists to .liate/sessions/<name>.json,
 * or delegates to a pluggable RemoteSessionAdapter / registered adapter.
 */
export class Session implements MemoryProvider {
  public readonly sessionId: string;
  public readonly filePath?: string;
  private adapter?: RemoteSessionAdapter;
  private data: SessionData;
  private loaded: boolean = false;

  constructor(target?: string, metadata?: Record<string, any>, adapter?: RemoteSessionAdapter) {
    this.adapter = adapter;

    const resolved = resolveSessionAdapter(target).create(target);
    this.sessionId = resolved.sessionId;
    this.filePath = resolved.filePath;
    if (!this.adapter && resolved.adapter) {
      this.adapter = resolved.adapter;
    }

    const now = new Date().toISOString();
    this.data = {
      sessionId: this.sessionId,
      createdAt: now,
      updatedAt: now,
      metadata: metadata || {},
      messages: [],
      state: {}
    };

    if (resolved.isInMemory && !this.adapter) {
      this.loaded = true;
    }
  }

  public async load(): Promise<SessionData> {
    if (this.adapter) {
      const remote = await this.adapter.load(this.sessionId);
      if (remote) {
        this.data = remote;
      }
      this.loaded = true;
      return this.data;
    }

    if (!this.filePath) {
      return this.data;
    }

    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(content);
      this.data = {
        sessionId: parsed.sessionId || this.sessionId,
        createdAt: parsed.createdAt || this.data.createdAt,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        metadata: { ...(this.data.metadata || {}), ...(parsed.metadata || {}) },
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        state: parsed.state && typeof parsed.state === "object" ? parsed.state : {}
      };
      this.loaded = true;
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw new Error(`Failed to load session memory from ${this.filePath}: ${err.message}`);
      }
      await this.save();
      this.loaded = true;
    }
    return this.data;
  }

  public async save(): Promise<void> {
    this.data.updatedAt = new Date().toISOString();
    if (this.adapter) {
      await this.adapter.save(this.data);
      return;
    }
    if (!this.filePath) {
      return;
    }

    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch {
      // In read-only or restricted environments, gracefully persist in memory
    }
  }

  public getMessages(): AgentMessage[] {
    return [...this.data.messages];
  }

  public async append(message: AgentMessage | AgentMessage[]): Promise<void> {
    if (!this.loaded && (this.filePath || this.adapter)) {
      await this.load();
    }
    const list = Array.isArray(message) ? message : [message];
    for (const msg of list) {
      this.data.messages.push({
        ...msg,
        timestamp: msg.timestamp ?? Date.now()
      });
    }
    await this.save();
  }

  public getState(key: string): any {
    return this.data.state[key];
  }

  public async setState(key: string, value: any): Promise<void> {
    if (!this.loaded && (this.filePath || this.adapter)) {
      await this.load();
    }
    this.data.state[key] = value;
    await this.save();
  }

  public async clear(): Promise<void> {
    this.data.messages = [];
    this.data.state = {};
    await this.save();
  }

  public async close(): Promise<void> {
    await this.adapter?.close?.();
  }
}

// Clean Aliases
export const InMemorySession = Session;
export const FileSessionMemory = Session;
