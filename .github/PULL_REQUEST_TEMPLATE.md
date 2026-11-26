## Summary

<!-- Briefly describe what this PR does and why. -->

Closes #

## Layer(s) Affected

- [ ] **L** — Large Models / Providers (`src/layers/llm/`)
- [ ] **I** — Integration / Memory / Knowledge (`src/layers/integration/`)
- [ ] **A** — Agent / Harness / ReAct Loop (`src/layers/agent/`)
- [ ] **T** — Tools / MCP (`src/layers/tools/`)
- [ ] **E** — Environment / Sandbox (`src/layers/environment/`)
- [ ] **Core / CLI / Runtime / Python SDK**
- [ ] **Hub Agents / Docs**

## Checklist

- [ ] No hardcoded API keys, tokens, or silent model defaults
- [ ] If adding a Layer `[L]` provider: added a dedicated file in `src/layers/llm/providers/` and registered it in `src/layers/llm/providers/registry.ts`
- [ ] `bun run typecheck` passes (`tsc --noEmit`)
- [ ] `bun test` passes (and new tests cover new behavior)
- [ ] Conventional Commit title used (e.g. `feat(llm): add groq provider`)
