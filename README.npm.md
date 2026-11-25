<div align="center">

# LIATE — Open Source OOP Framework for AI Agents
### Where Classes Are AI Agents · From India, For India, Beyond India 

`L[LM] · I[ntegration] · A[gent] · T[ools] · E[nvironment]`

<br>

<p align="center">
  <a href="https://liate.dev"><img src="https://img.shields.io/badge/docs-liate.dev-white?labelColor=black&style=flat-square" alt="Docs"></a>
  <a href="https://github.com/OpenLiate/Liate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square" alt="License: MIT"></a>
  <a href="https://sarvam.ai"><img src="https://raw.githubusercontent.com/OpenLiate/Liate/main/assets/sarvam-badge.svg" alt="Powered by Sarvam AI Startup Program"></a>
  <a href="https://exa.ai"><img src="https://raw.githubusercontent.com/OpenLiate/Liate/main/assets/exa-badge.svg" alt="Powered by Exa.ai Startup Program"></a>
  <a href="https://codespaces.new/OpenLiate/Liate"><img src="https://img.shields.io/badge/Codespaces-1--Click_Run-white?logo=github&logoColor=white&labelColor=black&style=flat-square" alt="Open in GitHub Codespaces"></a>
  <a href="https://www.npmjs.com/package/openliate"><img src="https://img.shields.io/badge/npm-v0.2.5-white?labelColor=black&style=flat-square" alt="npm: v0.2.5"></a>
  <a href="https://pypi.org/project/liate/"><img src="https://img.shields.io/badge/pypi-v0.2.5-white?logo=pypi&logoColor=FFD43B&labelColor=black&style=flat-square" alt="PyPI: v0.2.5"></a>
  <img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fgist.githubusercontent.com%2Fvinodhatti%2F4e50442b9bc06000069dd0c1552ab66b%2Fraw%2Fdownloads.json&style=flat-square&labelColor=black" alt="Total Downloads">
  <img src="https://img.shields.io/badge/Bun-Supported-white?logo=bun&logoColor=white&labelColor=black&style=flat-square" alt="Bun">
  <img src="https://img.shields.io/badge/Node.js-Supported-white?logo=node.js&logoColor=5FA04E&labelColor=black&style=flat-square" alt="Node.js">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openliate"><img src="https://img.shields.io/npm/dw/openliate?logo=npm&logoColor=CB3837&label=openliate&labelColor=black&color=white&style=flat-square" alt="npm openliate"></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/@openliate/liate"><img src="https://img.shields.io/npm/dw/@openliate/liate?logo=npm&logoColor=CB3837&label=%40openliate%2Fliate&labelColor=black&color=white&style=flat-square" alt="npm @openliate/liate"></a>
</p>

<p align="center">
  <a href="#aum-architecture"><img src="https://img.shields.io/badge/Agent_Architecture-AUM_(Agent_Unified_Module)-white?labelColor=black&style=flat-square" alt="Agent Unified Module (AUM)"></a>
  &nbsp;
  <a href="#runtime-engine"><img src="https://img.shields.io/badge/Core_Runtime_Engine-OM_(Orchestration_Module)-white?labelColor=black&style=flat-square" alt="Core Runtime Engine: OM (Orchestration Module)"></a>
</p>

<br>

> **#1 Selected for Sarvam AI Startup Program 2026** <sup>IN</sup> — Sovereign Indic AI Infrastructure  
> **#2 Selected for Exa.ai Startup Program (YC S21)** — \$2,500 Search API Credits  
> **#3 Architecture Validation (NVIDIA Keynote 2026)** — 1-to-1 Mapping to Jensen Huang's 5 Elements of an Agent  
> Built by **[OpenLiate](https://github.com/OpenLiate/Liate)** — Open Source Backend Layer for AI Agents

> *"If Stripe did payments in 7 lines of code, why not AI Agents in 5 lines of code?*  
> **Class is an Agent. Agent is a Function. Function is an API.**  
> *Don't build AI agents. Integrate by parts."*

</div>

---

## [0] Installation

```bash
# #1 Direct Package:
npm install openliate

# #2 Org-Scoped Package:
npm install @openliate/liate

# #3 via Bun:
bun add openliate
```

---

## [1] Quickstart: Frontier Sovereign Agent (`FrontierAgent` / `agentyaan`)

Every agent is declared natively as a TypeScript class inheriting from `liate`. The 5 layers map 1-to-1 to NVIDIA CEO Jensen Huang's 5 foundational agent elements:

```typescript
import { liate } from "openliate";
// or if using the org-scoped package:
// import { liate } from "@openliate/liate";

export class FrontierAgent extends liate {
  // [L] Large Models: Native Routing across Sovereign & 65+ Frontier AI Models:
  // - "sarvam/sarvam-105b" (Sarvam AI Indic Foundation Model - Startup Program 2026)
  // - "sarvam/sarvam-prism" (Sarvam AI Nov 2026 Frontier Decision & System-1 LoRA Model ~44ms)
  // - "sarvam/sarvam-30b" | "sarvam/bulbul-v4" | "sarvam/saaras-v4"
  // - "gnani/prisma-v3" (Gnani AI STT 10+ Indic Languages) | "gnani/timbre-v3" (Gnani AI TTS Multilingual)
  // - "neon/gemini-2.5-pro" | "neon/gemini-2.5-flash" (Google Gemini Frontier Series)
  // - "neon/claude-3-7-sonnet" | "neon/claude-3-5-haiku" (Anthropic Frontier Series)
  // - 65+ Frontier AI Models via Neon AI Gateway with JEV System-One Heuristic Routing
  L = "sarvam/sarvam-105b";

  // [I] Integration & Memory Layer
  I = { memory: "sessions/agentyaan" };

  // [A] Agent Harness Layer
  A = {
    name: "agentyaan",
    intent: "Frontier Sovereign AI Agent · Built on Liate · Selected for India's Sarvam AI Startup Program 2026",
    maxSteps: 5
  };

  // [T] Tools & MCP Layer (Stdio uvx/npx & Remote SSE)
  T = {
    // Local Stdio MCP: Sarvam AI Indic STT, TTS & Document tools
    sarvam_ai: {
      command: "uvx",
      args: ["sarvam-mcp"],
      tools: ["*"]
    },
    // Remote Hosted MCP: Bolna AI (YC-backed Voice Agent & Telephony Orchestration)
    bolna_voice: {
      url: "https://mcp.bolna.ai/api/mcp",
      headers: {
        Authorization: "Bearer $BOLNA_API_KEY"
      },
      tools: ["*"]
    }
  };

  // [E] Environment & Sandbox Layer
  E = { 
    SARVAM_API_KEY: "$SARVAM_API_KEY",
    BOLNA_API_KEY: "$BOLNA_API_KEY",
    GNANI_API_KEY: "$GNANI_API_KEY",
    NEON_API_KEY: "$NEON_API_KEY"
  };
}

// Run the agent via the autonomous ReAct loop:
const agent = new FrontierAgent();
const result = await agent.run("Introduce Mission AgentYaan and explain why sovereign OOP AI agents matter for India.");
console.log(result.text);
```

---

## [2] Instant Run (Zero Install)

Run any agent directly without installation using `npx`:

```bash
npx openliate run agent.ts "Fetch https://liate.dev and summarize"
```

---

## [3] The 5 Layers (L · I · A · T · E)

### #1 Industry Architecture Parity: NVIDIA Keynote 2026

In the **NVIDIA Keynote 2026**, NVIDIA CEO Jensen Huang defined the five foundational elements of an autonomous agent:  
> *"AI Factories Produce Intelligence. Agents Put Intelligence to Work... Model, Knowledge, Tools, Sandbox, Harness — These are the five elements of an agent."*

OpenLiate maps 1-to-1 to this 5-element architecture:

| 5 Elements of an Agent (NVIDIA Keynote 2026) | Liate Layer (L · I · A · T · E) | Production File | Architecture Role |
| :--- | :--- | :--- | :--- |
| **[1] Model** | **`[L]` Large Models** | `src/layers/llm/model.ts` | Native routing to Sarvam AI, Ollama & 65+ models |
| **[2] Knowledge** | **`[I]` Integration** | `src/layers/integration/knowledge.ts` | Persistent memory sessions & vector knowledge |
| **[3] Harness** | **`[A]` Agent Harness** | `src/layers/agent/harness.ts` | Autonomous ReAct loop with max-steps safeguards |
| **[4] Tools** | **`[T]` Tools & MCP** | `src/layers/tools/mcp.ts` | Anthropic Model Context Protocol (MCP v2) stdio & SSE |
| **[5] Sandbox** | **`[E]` Environment** | `src/layers/environment/sandbox.ts` | Sandboxed environment isolation & secure secret injection |

<br>

### #2 The 5 Layers Specification Matrix

| Layer | Name | Description |
| :--- | :--- | :--- |
| **`L`** | **Large Models** | Universal dynamic routing across Sarvam AI, Ollama local (`localhost:11434/v1`), OpenRouter (469+ live models), Neon AI Gateway & Gnani AI. |
| **`I`** | **Integration** | Sovereign memory sessions, vector knowledge graphs, and local execution state. |
| **`A`** | **Agent Harness** | Autonomous ReAct loop with max-steps safeguards and self-healing error recovery. |
| **`T`** | **Tools & MCP** | Native Anthropic Model Context Protocol (MCP) clients over stdio and SSE protocols. |
| **`E`** | **Environment** | Sandboxed environment isolation and secure secret injection. |

---

## [4] CLI Reference

| Command | Action |
| :--- | :--- |
| `openliate run [file] <prompt>` | Execute agent with a prompt |
| `openliate chat [file]` | Start interactive multi-turn REPL session |
| `openliate serve [--port]` | Launch high-performance Hono HTTP/SSE edge runtime |
| `openliate create <name>` | Scaffold a new agent project |
| `openliate hub` | List prebuilt agent templates |

---

## [5] Real Production Ecosystem Traction

| Registry | Package Distribution | Total Downloads | Telemetry Source |
| :--- | :--- | :--- | :--- |
| **npm** | [`openliate`](https://www.npmjs.com/package/openliate) | **1,148+** | Direct Developer CLI & Runners |
| **npm** | [`@openliate/liate`](https://www.npmjs.com/package/@openliate/liate) | **1,047+** | TypeScript SDK Imports |
| **PyPI** | [`openliate`](https://pypi.org/project/openliate/) | **945+** | Clean Human Python Installs (3,401+ total) |
| **PyPI** | [`liate`](https://pypi.org/project/liate/) | **729+** | Clean Human Python Installs (2,500+ total) |
| **Total** | **Combined Ecosystem** | **8,096+ Total Installs** | **Over 3,869+ Direct Human Installs** |

---

<div align="center">

**[Documentation](https://liate.dev)** · **[Website](https://liate.dev)** · **[GitHub](https://github.com/OpenLiate/Liate)**

Built from India, for India, and beyond India

</div>
