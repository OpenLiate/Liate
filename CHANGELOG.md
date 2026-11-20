# Changelog — Liate

All notable changes to Liate: Open Source Backend Layer for AI Agents — From India, For India, Beyond India 🇮🇳 🌍

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
