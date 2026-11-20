<div align="center">

# LIATE — Open Source OOP Framework for AI Agents
### Where Classes Are AI Agents · From India, For India, Beyond India 

`L[LM] · I[ntegration] · A[gent] · T[ools] · E[nvironment]`

<br>

<p align="center">
  <a href="https://openliate.tech/docs"><img src="https://img.shields.io/badge/docs-openliate.tech%2Fdocs-white?labelColor=black&style=flat-square" alt="Docs"></a>
  <a href="https://github.com/OpenLiate/Liate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square" alt="License: MIT"></a>
  <a href="https://sarvam.ai"><img src="./assets/sarvam-badge.svg" alt="Powered by Sarvam AI Startup Program"></a>
  <a href="https://codespaces.new/OpenLiate/Liate"><img src="https://img.shields.io/badge/Codespaces-1--Click_Run-white?logo=github&logoColor=white&labelColor=black&style=flat-square" alt="Open in GitHub Codespaces"></a>
  <a href="https://www.npmjs.com/package/openliate"><img src="https://img.shields.io/badge/npm-v0.1.6-white?labelColor=black&style=flat-square" alt="npm: v0.1.6"></a>
  <a href="https://pypi.org/project/liate/"><img src="https://img.shields.io/badge/pypi-v0.1.6-white?logo=pypi&logoColor=FFD43B&labelColor=black&style=flat-square" alt="PyPI: v0.1.6"></a>
  <img src="https://img.shields.io/badge/Total_Downloads-1%2C495%2B-brightgreen?labelColor=black&style=flat-square" alt="Total Downloads">
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

> **Milestone: Liate — Selected for India's Sarvam AI Startup Program 2026** <sup>IN</sup>  
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
npx openliate run agent.ts "Fetch https://openliate.tech and summarize"
```

---

## [3] The 5 Layers (L · I · A · T · E)

| Layer | Name | Description |
| :--- | :--- | :--- |
| **`L`** | **Large Models** | Universal routing to Sarvam AI (`sarvam-105b`, `sarvam-30b`), Ollama local, or OpenRouter with fallback cascade. |
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
| **npm** | [`openliate`](https://www.npmjs.com/package/openliate) | **531+** | Direct Developer CLI & Runners |
| **npm** | [`@openliate/liate`](https://www.npmjs.com/package/@openliate/liate) | **270+** | TypeScript SDK Imports |
| **PyPI** | [`openliate`](https://pypi.org/project/openliate/) | **458+** | Python AI Pipelines |
| **PyPI** | [`liate`](https://pypi.org/project/liate/) | **236+** | Python AUM/OM Imports |
| **Total** | **Combined Ecosystem** | **1,495+ Total Installs** | **Over 800+ Direct Human Installs** |

---

<div align="center">

**[Documentation](https://openliate.tech/docs)** · **[Website](https://openliate.tech)** · **[GitHub](https://github.com/OpenLiate/Liate)**

Built from India, for India, and beyond India

</div>
