/**
 * Liate — Layer [L]: Sovereign Large Models & AI Gateway
 *
 * Modular Architecture:
 * - providers/   : 1 file per provider (Sarvam, Neon, Gnani, Ollama, OpenRouter, custom OpenAI-compat)
 * - transport/   : Shared resilient HTTP + SSE streaming engine
 * - normalize.ts : Zero-hardcode model & MultiModelMap normalization
 * - client.ts    : LiateLlmClient
 * - router.ts    : LLMRouter
 */

export * from "@/layers/llm/types";
export * from "@/layers/llm/normalize";
export * from "@/layers/llm/transport/fetch";
export * from "@/layers/llm/transport/sse";
export * from "@/layers/llm/providers/openai-compat";
export * from "@/layers/llm/providers/registry";
export * from "@/layers/llm/client";
export * from "@/layers/llm/router";
