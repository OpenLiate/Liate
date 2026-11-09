# Changelog — Liate

All notable changes to Liate: Open Source AI Agents Framework — Built for Sovereign AI Agents From India to the World.

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
