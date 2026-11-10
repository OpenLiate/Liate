# Changelog — Liate

All notable changes to Liate: Open Source AI Agents Framework — Built for Sovereign AI Agents From India to the World.

---

## Sprint 2: Core Engine, Runtime & CLI (v0.0.6 → v0.1.0)

### v0.0.9 (Local Agent Hub)
- Local agent hub under `hub/agents/` with zero remote dependencies.
- Run hub agents directly by name (e.g. `liate run sarvam-agent`).
- `liate hub` command listing local agents, models, and intents.
- Bundled agents: `sarvam-agent` (Sarvam 105B) and `prism-agent` (Sarvam Prism).

### v0.0.8 (Unified Developer CLI & Dynamic Resolver)
- Unified developer CLI (`liate`) with native Node script (`dist/bin.js`) and standalone binary (`dist/cli/liate.exe`).
- Dynamic agent resolver supporting `agent.ts`, `agent.json`, and ephemeral sovereign agents.
- 3 core execution commands: `liate run [file] <prompt>`, `liate chat [file]`, and `liate serve [file] [--port 7071]`.
- Native dual runtime support for Bun and Node with zero external prompt libraries.

### v0.0.7 (Edge Runtime Server)
- High-performance edge HTTP server powered by Hono on port 7071.
- 4 pure endpoints: `GET /health`, `POST /run`, `POST /chat`, `POST /stream`.
- Multi-turn conversational session memory handling via Session provider.
- Real-time Server-Sent Events (SSE) streaming of agent steps and tokens.
- Verified live with Sarvam AI 105B API.

### v0.0.6 (OOP Class & Core Architecture)
- Added 5 layers specification in `src/core/spec.ts` (`L · I · A · T · E`).
- Added Agent Unified Module (AUM) in `src/core/aum.ts` supporting shorthand (`L, I, A, T, E`), full name, and lowercase declarations.
- Added Orchestration Module (OM) in `src/core/om.ts` introducing `class liate` base class (`class MyAgent extends liate`).
- Added framework entrypoint in `src/liate.ts` for both SDK imports and direct execution.
- Added standalone native binary compilation via Bun (`bun run compile` / `bun build ./src/liate.ts --compile --outfile dist/liate`).
- Added graceful MCP lifecycle teardown (`agent.close()`) releasing stdio child process pipes on completion.
- Added `src/layers/llm/types.ts` achieving 100% folder symmetry across all 5 layers.
- Adopted modern `@/*` path aliases across the entire codebase with zero relative traversals (`./` or `../`).
- Added `bun-types` and dual runtime type definitions for Bun and Node.
- Verified live execution of `agent.json` with Sarvam AI 105B and `uvx mcp-server-time` in 809ms.

---

## Sprint 1: The 5 Elements Foundation (v0.0.0 → v0.0.5)

### v0.0.5 (Layer E: Environment & Sandbox)
- Native `.env` and `.env.local` file parser without external dependencies.
- Secret masking (`sk_r***tLyG`) for logging and debugging.
- Environment variable expansion (`$VAR`).
- Sandbox configuration and domain boundaries.
- Verified end-to-end execution of `agent.json` with Sarvam AI 105B.

### v0.0.4 (Layer T: Tools of MCP Server V2)
- Model Context Protocol (MCP v2) client implementation.
- Stdio transport for local tools (`uvx`, `npx`).
- HTTP/SSE transport for remote MCP servers.
- Verified live with `uvx mcp-server-time`, `npx @modelcontextprotocol/server-memory`, and AgentMail HTTP MCP.
- `createAgentMcpServer`: Expose an Agent as an MCP server.

### v0.0.3 (Layer A: Agent Harness & ReAct Loop)
- ReAct reasoning loop (Reason → Act → Observe → Answer).
- Agent harness with `name` and `intent` (Intent as system prompt).
- Multi-step tool execution cycle.
- Verified live with Sarvam AI 105B.

### v0.0.2 (Layer I: Integration Layer)
- Session memory provider (in-memory and JSON file persistence).
- Knowledge document resolver and search tool generation.
- Multi-turn conversation history tracking.

### v0.0.1 (Layer L: Large Language Models)
- Sarvam AI chat completion client (`sarvam-105b`, `sarvam-105b-conversations`).
- Dual authentication headers (`Authorization: Bearer` and `api-subscription-key`).
- Sarvam System-One decision API integration.
- LLMRouter with dynamic model parameter resolution.

### v0.0.0 (Genesis)
- Initial repository setup and MIT License.
- Open Source AI Agents Framework — Built for Sovereign AI Agents From India to the World.
