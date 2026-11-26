# Changelog — Liate

All notable changes to Liate: Open Source Backend Layer for AI Agents — From India, For India, Beyond India 🇮🇳 🌍

---

## Sprint 6: Full L·I·A·T·E Modularization, Multi-Model L, Sub-Agents, Vector RAG & Open Source Governance (v0.3.0)

### v0.3.0 (Sprint 6 — Modular 5-Layer Architecture & Contributor-Ready Ecosystem)
- **Layer `[L]` Modularization & Multi-Model Map**: Split `src/layers/llm/` into `providers/`, `transport/`, `normalize.ts`, `client.ts`, `router.ts`, and `model.ts`. Added `MultiModelMap` (`L: { default, fast, reason }`) + `modelTag` routing, and added the **Groq** provider (`src/layers/llm/providers/groq.ts`).
- **Layer `[I]` Universal Integration, 3 Memory Backends & 2026 Vector RAG**: Organized `src/layers/integration/` into `memory/adapters/` (Local JSON, SQLite/Turso `libsql://`, PostgreSQL/Neon/Supabase via `Bun.SQL`), `knowledge/sources/` (local files + 2026 `pgvector` HNSW cosine `<=>` + Pinecone `2026-07` REST API) with dynamic `embeddings.ts`, `context/` (`ContextManager` for `I.context`), `lib/`, `repo/`, and `connectors/` (`http-api` for `I.apis`, `webhook` for `I.webhooks`).
- **Layer `[A]` Sub-Agents, Versioning & Modular Skills**: Organized `src/layers/agent/` into `harness/`, `loop/`, `skills/sources/`, `orchestration/subagent.ts` (`A.subAgents` with `modelTag` pointers to `L`), and `versioning/` (`AgentVersionControl` SHA-256 snapshots, diffs, and rollbacks with zero `E` secrets stored).
- **Layer `[T]` & `[E]` Modularization**: Split `src/layers/tools/` into `mcp/` (`client`, `stdio`, `http`, `inline` MCP v2, `server`), `builtin/` (`datetime`, `math`), `api/` (`createApiTool`), and `registry/resolver.ts`. Split `src/layers/environment/` into `env/loader.ts`, `sandbox/guard.ts`, and `resolver.ts`.
- **Open-Source Governance**: Added `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/PULL_REQUEST_TEMPLATE.md`, and `.github/ISSUE_TEMPLATE/*`.
- **Automated Verification**: Expanded `bun test` to 38 passing tests (154 assertions) across `tests/core.test.ts`, `tests/layers.test.ts`, and `tests/sprint6.test.ts`.

---

## Sprint 5: Global Gateways, Live Streaming, Sandbox Hardening & Automated Tests (v0.2.1 → v0.2.5)

### v0.2.5 (Sprint 5 Conclusion — Production Streaming, Global Gateways & Zero-Default Runtime)
- **v0.2.4 — Dynamic Ollama & OpenRouter Gateways + Strict Layer `[L]`**: Added zero-hardcode support for local **Ollama** (`ollama/<model>` via `http://localhost:11434/v1`) and **OpenRouter** (`openrouter/<vendor>/<model>` via `https://openrouter.ai/api/v1` with `HTTP-Referer`, `X-Title`, and `X-OpenRouter-Title` headers and 469+ live discoverable models). Fixed double-stripping of `vendor/model` and `model:tag` slugs in `src/layers/llm/model.ts`. Removed silent hardcoded model fallbacks across `om.ts`, `harness.ts`, `model.ts`, `resolver.ts`, and `hono.ts` (`LIATE_MODEL` env support for ephemeral runs). Added `hub/agents/ollama-agent/agent.json` and `hub/agents/openrouter-agent/agent.json`.
- **v0.2.3 — Layer `[E]` Sandbox, Layer `[T]` MCP Retry & Layer `[I]` Remote Session**: Added active `EnvironmentResolver.assertNetworkAllowed()` (`denyNetwork` + `allowedDomains`) and `runWithTimeout()` in `src/layers/environment/sandbox.ts`; wired opt-in `sandboxTimeoutMs` into `ReActLoop`. Added 15s timeout + bounded retry (`fetchWithRetry`) for remote HTTP/SSE MCP servers in `src/layers/tools/mcp.ts`. Added `RemoteSessionAdapter` injection to `Session` and optional `agentId`/`email` fields in `LayerI` / `AUMSchema`.
- **v0.2.2 — End-to-End SSE Streaming & Python SDK Parity**: Added `parseSseStream` (`stream`, `onToken`, `onReasoningToken`) in `LiateLlmClient`, wired live token/step callbacks through `ReActLoop`, CLI (`liate run`, `liate chat`), and Hono `POST /stream`. Aligned Hono `/run`, `/chat`, and `/stream` with Python SDK `{ module, prompt, keys }` payloads and added `agent.stream()` to `sdk/python`.
- **Automated Test Suite & Cleanup**: Added 16-case `bun test` suite (`tests/core.test.ts`, `tests/layers.test.ts`) covering AUM, OM, and all 5 `L · I · A · T · E` layers, and removed unused `jszip` dependency.

---

## Sprint 4: Architecture Validation & Pure MDX Docs (v0.2.0)

### v0.2.0 (NVIDIA Keynote 2026 Architecture Parity, Standalone Docs Package & Runtime Benchmarks)
- **NVIDIA Keynote 2026 Architecture Parity**: Formal 1-to-1 indexed mapping of Liate's 5 mathematical layers ($L \circ I \circ A \circ T \circ E$) with Jensen Huang's 5 Elements of an Agent (Model, Knowledge, Harness, Tools, Sandbox). Enforced strict `#1`, `#2`, `#3` indexing doctrine across all READMEs and SDKs.
- **Dev-Native MDX Docs Package**: Refactored `docs/` into a standalone, lightweight MIT-licensed content package (`@openliate/docs`). Stripped all website code, dependencies, and build overhead from the open-source repo for zero-friction community contributions.
- **Hardware & Runtime Benchmark Verification**: Verified 32.45 µs average agent instantiation overhead, 30,821 agent instantiations/sec throughput, and 2.76 ms for 50-agent parallel swarm initialization on real hardware. Full report in `benchmark/README.md`.
- **Hello Agent Standardization**: Replaced legacy "Hello World" patterns with the sovereign "Hello Agent" standard across all runtime examples and CLI runners.
- **Traction & Ecosystem Growth**: Surpassed 2,087+ package installs across npm (`openliate`, `@openliate/liate`) and PyPI (`liate`, `openliate`); inducted into Exa.ai (YC S21) Startup Program and Sarvam AI Startup Program 2026.

---

## Sprint 4: Sovereign Agent Benchmarks, 7 OOP Paradigms & Sarvam Payload Hardening (v0.1.6)

### v0.1.6 (High-Speed Runtime Benchmark, 7 OOP Paradigms Suite & Frontier Model Payload Hardening)
- **1,860x to 2,668x Faster Framework Overhead Benchmark (`benchmark_runtime.ts`)**: Proved native Object-Oriented Programming (OOP) agent instantiation latency at 31.86 µs – 45.70 µs vs LangChain's ~85,000 µs (up to 2,668x faster) and achieving over 31,380 agent boots/second on real hardware. Full reproducible benchmark report published in `benchmark/README.md`.
- **7 OOP Core Paradigms Formal Verification Suite (`benchmark_oop.ts`)**: Real execution test verifying Class, Object, Inheritance, Polymorphism, Encapsulation, Abstraction, and Composition running natively on Sarvam 105B Indic foundation model.
- **Production Adoption Milestone (1,495+ Downloads)**: Crossed 1,495 total installs across npm (801: `openliate` + `@openliate/liate`) and official PyPI stats (694: `openliate` + `liate`), with over 800+ verified clean human installs (`without_mirrors`).
- **Sarvam AI Payload Sanitizer & Gateway Compatibility**: Hardened `src/layers/llm/model.ts` to automatically strip extraneous metadata fields (`memory`, `intent`, `maxSteps`, `name`, `text`) before dispatching to Sarvam's `/v2/chat/completions` API.
- **Subclass Intent & Swarm Specialization**: Demonstrated polymorphic inheritance where specialized agents (e.g. `CashfreePaymentAgent`) inherit base configurations and execute domain-specific reasoning without DAG/chain overhead.
- **Cryptographic Supply-Chain Verification**: Introduced formal SSH commit signing for enterprise bank-grade integrity, ensuring all commits from v0.1.6 onwards carry verified cryptographic provenance.

---

## Sprint 3: Modular Skills, Multi-Language SDKs & Platform Ecosystem (v0.1.1 → v0.1.5)

### v0.1.5 (Fumadocs Migration, PyPI & NPM Multi-Package Release, 1-Click Installers & CI/CD Automation)
- **Dual-Package NPM Distribution**: Published both unscoped (`openliate`) and organization-scoped (`@openliate/liate`) packages to npm with cryptographic provenance (`--provenance`).
- **Dual-Package PyPI Distribution**: Published both `liate` and `openliate` Python distributions to PyPI built via Hatchling (`builder.py`).
- **Automated GitHub Actions CI/CD**: Introduced `.github/workflows/release.yml` with OIDC PyPI publishing and npm token authentication, verified end-to-end on GitHub Actions.
- **1-Click Operating System Installers**: Created zero-dependency installation scripts `install.ps1` (Windows PowerShell) and `install.sh` (Linux / macOS) hosted directly under `docs/public`.
- **Fumadocs Documentation Portal Migration**: Replaced legacy static documentation engine with Next.js Fumadocs interactive documentation portal (`docs.openliate.tech`), featuring OpenAPI reference playgrounds and AI Doc Search.
- **Sovereign Documentation Assistant (`DocGyan`)**: Cleaned up legacy `doculisa` references across codebase, hub agents, and API routes in favor of official `DocGyanAgent`.
- **Packaging & Version Synchronizer Automation**: Implemented `scripts/packer.mjs`, `scripts/publisher.mjs`, and `scripts/bump.mjs` for synchronized version bumps across TypeScript, Python, and documentation badges.

### v0.1.4 (Neon AI Gateway & Gnani AI Voice Integration)
- **Neon AI Gateway (65+ Models)**: Dynamic endpoint resolution for 65+ frontier models and JEV System-One heuristic decision routing.
- **Gnani AI Timbre 3.0 (TTS)**: Dynamic text-to-speech synthesis supporting multi-voice selection (`Shivani`, `Avinash`, etc.).
- **Gnani AI Prisma 3.0 (STT)**: Low-latency Speech-to-Text integration with automated `indic-auto` language detection.
- **Dynamic Audio Pipeline**: Native decoding of raw PCM audio streams, automatic 44-byte RIFF/WAV header synthesis, and CLI auto-saving.
- **Zero-Hardcode Runtime Passthrough**: Schema `.passthrough()` on Layer `[L]` and OM harness ensuring custom options are preserved.
- **Hub Sovereign Agents**: Reference implementations added in `hub/agents/neon-agent/` and `hub/agents/gnani-agent/`.

### v0.1.3 (Mintlify Documentation Suite & Clean Architecture Specification)
- **Mintlify Documentation Engine**: Configured complete `docs/` suite (`docs.json`) ready for `docs.openliate.tech` / `liate.dev`.
- **Accurate API References**: Aligned `POST /run`, `GET /health`, and `/skills` with real Hono edge runtime contracts on port `7071`.
- **Eliminated Outdated Terminology**: Stripped legacy cluster references, port discrepancies, and multi-cloud marketing claims in favor of real, verified architecture.
- **Unified Branding**: Ensured 100% synchronization across `docs/`, `README.md`, `package.json`, and Python SDK specs.

### v0.1.2 (Official Python SDK & 5-Line AUM Class Parity)
- **Official Python SDK**: Released pip-ready package `liate` under `sdk/python/` with client and Orchestration Module (OM).
- **OOP Class Parity**: 100% symmetry across TypeScript (`agent.ts`), Python (`agent.py`), and JSON (`agent.json`).
- **Identity & Positioning Alignment**: Standardized brand as **"Open Source Backend Layer for AI Agents · From India, For India, Beyond India"**.
- **CLI & SDK Multi-Language Discovery**: Extended dynamic runtime resolvers to discover and execute `.py`, `.ts`, and `.json` agents on the fly.

### v0.1.1 (Dynamic Agent Skills, Project Scaffolding & WASM Layer)
- **Dynamic Agent Skills Engine**: Integrated with skills.sh ecosystem (`src/layers/agent/skills.ts`) with `find`, `add`, and `update` commands.
- **Agent Skills HTTP Router**: Mounted `/skills` endpoint in Hono edge runtime.
- **Project Scaffolding**: Built-in `liate create <name> [--py]` / `init` / `new` generator for TypeScript and Python agent templates (`src/scaffold/project.ts`).
- **WASM Runtime Layer**: Added experimental WASM execution module (`src/runtime/wasm.ts`).
- **Layer A Harness Extension**: Dynamic skill prompt formatting and system prompt injection.
- **Monotonic UUID & Integration**: Added RFC 9562 UUIDv7 generator (`src/core/uuid.ts`) and repository integration helpers.
- **Core Versioning**: Added centralized version synchronization utility (`src/core/version.ts`).

---

## Sprint 2: Core Engine, Runtime & CLI (v0.0.6 → v0.1.0)

### v0.1.0 — Open Source AI Agent Framework
*Built for Sovereign AI Agents From India to the World*
- **Universal Container Deployment**: Node 26 Active LTS runner + Bun builder + Astral uv/uvx for native MCP tool execution.
- **Modern Compose Specification**: Zero-cloud local Docker Compose deployment on port `7071` with Sarvam AI.
- **1-Click GitHub Codespaces**: Pre-configured `.devcontainer` with Node 26, Python 3, Bun, and auto-forwarded edge runtime port.
- **Specification Alignment**: Synchronized `agent.json` declarative schema and cleaned documentation.

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
