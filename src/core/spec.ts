/**
 * Liate — Open Source AI Agents Framework
 * Built for Sovereign AI Agents From India to the World.
 * 
 * The 5 Layers:
 * L[LM]         — Sovereign Language Models & Reasoning
 * I[ntegration] — Session Memory, Knowledge Context & State
 * A[gent]       — Identity, Name, Intent & Autonomous ReAct Loop
 * T[ools]       — Tools of MCP Server V2 (Stdio & Remote HTTP/SSE)
 * E[nvironment] — Environment Variables, Secrets & Sandbox Configuration
 */

/**
 * [L] LLM Layer
 * Sovereign Language Models: Sarvam AI 105B & OpenAI-compatible providers.
 */
export type LayerL = 
  | string
  | {
      provider?: string;
      model: string;
      baseUrl?: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
    };

export type ModelConfig = LayerL;

/**
 * [I] Integration Layer
 * Memory, Knowledge Context, and Persistence.
 */
export interface LayerI {
  knowledge?: string | string[] | Record<string, unknown>;
  memory?: string;
  state?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * [A] Agent Layer
 * Identity: Name, Intent, Version, maxSteps.
 */
export interface LayerA {
  name: string;
  intent?: string;
  version?: string;
  system?: string;
  maxSteps?: number;
  skills?: string[];
  [key: string]: unknown;
}

/**
 * [T] Tools Layer
 * Tools of MCP Server V2 (Local Stdio & Remote HTTP/SSE), Custom Handlers.
 */
export interface ToolDefinition {
  name?: string;
  description?: string;
  command?: string;
  args?: string[];
  url?: string;
  tools?: string[];
  parameters?: Record<string, unknown>;
  execute?: (args: Record<string, unknown>) => Promise<unknown> | unknown;
  [key: string]: unknown;
}

export type LayerT =
  | Array<string | ToolDefinition>
  | Record<string, ToolDefinition | string | Record<string, unknown>>;

/**
 * [E] Environment Layer
 * Configuration, API keys, and environment variables (.env).
 */
export type LayerE = Record<string, string | undefined>;

/**
 * The 5 Layers Agent Specification (AgentSpec / AgentModule)
 * Supports authoring across 3 casing conventions:
 * 1. Shorthand: L · I · A · T · E
 * 2. Full Name: LLM · Integration · Agent · Tools · Environment
 * 3. Lowercase: llm · integration · agent · tools · environment
 */
export interface AgentSpec {
  L: LayerL;
  I?: LayerI;
  A: LayerA | string;
  T?: LayerT;
  E?: LayerE;

  // Full-name aliases
  LLM?: LayerL;
  llm?: LayerL;

  Integration?: LayerI;
  integration?: LayerI;

  Agent?: LayerA | string;
  agent?: LayerA | string;

  Tools?: LayerT;
  tools?: LayerT;

  Environment?: LayerE;
  environment?: LayerE;
}

export type AgentModule = AgentSpec;
