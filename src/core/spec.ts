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
 *
 * Supports 3 forms:
 * 1. Single model string:   L: "sarvam/sarvam-m"
 * 2. Single model object:   L: { provider: "ollama", model: "gemma4:e2b" }
 * 3. Named multi-model map: L: { default: "sarvam/sarvam-m", fast: "ollama/gemma4:e2b", reason: "openrouter/..." }
 *    — Agent selects the right model by tag: run(prompt, { modelTag: "fast" })
 */
export type SingleModelConfig = 
  | string
  | {
      provider?: string;
      model: string;
      baseUrl?: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
    };

/** Named multi-model map — developer declares their own tags (fast, reason, voice, …) */
export type MultiModelMap = Record<string, SingleModelConfig>;

export type LayerL = SingleModelConfig | MultiModelMap;

export type ModelConfig = LayerL;

/** Utility: returns true if LayerL is a named multi-model map */
export function isMultiModelMap(L: LayerL): L is MultiModelMap {
  if (!L || typeof L !== "object") return false;
  // A SingleModelConfig object must have a "model" key; a MultiModelMap doesn't
  return !("model" in (L as object));
}

/** Resolves a model tag from a MultiModelMap (falls back to "default" or first entry) */
export function resolveModelTag(L: MultiModelMap, tag?: string): SingleModelConfig {
  if (tag && tag in L) return L[tag];
  if ("default" in L) return L["default"];
  const first = Object.values(L)[0];
  if (!first) throw new Error("[Liate Error]: MultiModelMap has no model entries in Layer [L].");
  return first;
}

/**
 * [I] Integration Layer
 * Memory, Knowledge Context, and Persistence.
 */
export interface LayerI {
  knowledge?: string | string[] | Record<string, unknown>;
  context?: string | Record<string, unknown>;
  memory?: string;
  state?: Record<string, unknown>;
  agentId?: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Sub-agent specification declared under Layer [A].subAgents.
 * Never duplicates Layer [L] — uses optional modelTag to select from the parent's Layer [L].
 */
export interface SubAgentSpec {
  name: string;
  intent?: string;
  modelTag?: string;
  maxSteps?: number;
  skills?: string[];
}

/**
 * [A] Agent Layer
 * Identity: Name, Intent, Version, maxSteps, subAgents.
 */
export interface LayerA {
  name: string;
  intent?: string;
  version?: string;
  system?: string;
  maxSteps?: number;
  skills?: string[];
  subAgents?: SubAgentSpec[];
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
