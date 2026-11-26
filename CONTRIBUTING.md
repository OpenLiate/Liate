# Contributing to OpenLiate (`Liate`)

Welcome to **OpenLiate** — the open-source OOP framework for AI agents (`Agent = L ∘ I ∘ A ∘ T ∘ E`).

We love clean, focused pull requests. Because Liate is organized cleanly around the 5 mathematical layers (`L · I · A · T · E`), you can contribute new LLM providers, tools, or hub templates without touching core engine files.

---

## 1. Core Design Rules (Non-Negotiable)

1. **Zero Hardcoded Models or Silent Fallbacks**: Never hardcode a default model name or silent fallback in `src/core/*` or `src/layers/*`. Always require explicit Layer `[L]` config and discover live models from provider `/models` endpoints.
2. **Zero Hardcoded Keys**: Never commit API keys, tokens, or `.env` values. Keys must only be read dynamically from environment variables or explicit runtime options.
3. **No `index.ts` Stubs**: Every module uses an explicit, descriptive filename (`model.ts`, `registry.ts`, `harness.ts`, etc.).
4. **Keep Layers Clean**:
   - `L` (`src/layers/llm/`) — Large Models, gateways, transport, model normalization
   - `I` (`src/layers/integration/`) — Session memory, knowledge context, remote adapters
   - `A` (`src/layers/agent/`) — Identity, ReAct loop, harness, skills
   - `T` (`src/layers/tools/`) — MCP v2 (Stdio & HTTP/SSE) & custom tool registry
   - `E` (`src/layers/environment/`) — Env vars, secret masking, sandbox guardrails

---

## 2. Local Development Setup

**Prerequisites**: [Bun](https://bun.sh) (`>= 1.2`) and Git.

```bash
git clone https://github.com/OpenLiate/Liate.git
cd Liate
bun install
```

Run checks before opening any PR:

```bash
bun run typecheck   # TypeScript check (tsc --noEmit)
bun test            # Full unit & layer test suite
bun run build:bin   # CLI bundle check
bun run build:sdk   # SDK bundle check
```

---

## 3. Adding a Layer `[L]` Model Provider (2-Step PR)

Adding an OpenAI-compatible provider (e.g. Groq, Cerebras, Together, Fireworks, Mistral) takes **1 new file + 1 line**:

### Step 1: Create `src/layers/llm/providers/<provider>.ts`

```ts
import type { ProviderDefinition } from "@/layers/llm/types";

export const groqProvider: ProviderDefinition = {
  id: "groq",
  name: "Groq",
  version: "v1",
  baseUrl: () => process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  envKeys: ["GROQ_API_KEY"],
  features: {
    tool_calling: true,
    streaming: true,
    reasoning: true
  }
};
```

> All resilient HTTP (`transport/fetch.ts`), SSE streaming (`transport/sse.ts`), key lookup, and `LLMRouter.listModels("<provider>")` discovery work automatically.

### Step 2: Register in `src/layers/llm/providers/registry.ts`

Import your provider and add it to `BUILTIN_PROVIDERS`:

```ts
export const BUILTIN_PROVIDERS: ProviderDefinition[] = [
  sarvamProvider,
  neonProvider,
  gnaniProvider,
  ollamaProvider,
  openrouterProvider,
  groqProvider
];
```

### Step 3: Add a Unit Test

Add normalization / gateway assertion coverage in `tests/` and verify `bun run typecheck && bun test` passes.

---

## 4. Adding a Hub Agent Template

Add a directory under `hub/agents/<agent-name>/agent.json` using standard `L · I · A · T · E` keys and `$ENV_VAR` references (never raw keys):

```json
{
  "L": "provider/model-name",
  "A": {
    "name": "MyAgent",
    "intent": "Clear description of what this agent does.",
    "maxSteps": 8
  },
  "E": {
    "MY_PROVIDER_API_KEY": "$MY_PROVIDER_API_KEY"
  }
}
```

Test locally with:

```bash
bun run src/cli/index.ts hub
```

---

## 5. Commit & Pull Request Guidelines

We follow **Conventional Commits**:

- `feat(llm): add groq provider`
- `feat(tools): support custom mcp headers`
- `fix(runtime): handle empty sse chunk`
- `test(core): add coverage for multi-model map`
- `docs: update provider setup guide`

Before submitting your PR:
- Link any related Issue (`Closes #123`).
- Keep PRs focused on one feature or fix.
- Confirm `bun run typecheck` and `bun test` pass cleanly.
