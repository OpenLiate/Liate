<div align="center">

# LIATE — Open Source OOP Framework for AI Agents
### Where Classes Are AI Agents · From India, For India, Beyond India 🇮🇳 🌍

`L[LM] · I[ntegration] · A[gent] · T[ools] · E[nvironment]`

<br>

<p align="center">
  <a href="https://openliate.tech/docs"><img src="https://img.shields.io/badge/docs-openliate.tech%2Fdocs-white?labelColor=black&style=flat-square" alt="Docs"></a>
  <a href="https://github.com/OpenLiate/Liate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square" alt="License: MIT"></a>
  <a href="https://sarvam.ai"><img src="./assets/sarvam-badge.svg" alt="Powered by Sarvam AI Startup Program"></a>
  <a href="https://codespaces.new/OpenLiate/Liate"><img src="https://img.shields.io/badge/Codespaces-1--Click_Run-white?logo=github&logoColor=white&labelColor=black&style=flat-square" alt="Open in GitHub Codespaces"></a>
  <a href="https://www.npmjs.com/package/openliate"><img src="https://img.shields.io/badge/npm-v0.1.5-white?labelColor=black&style=flat-square" alt="npm: v0.1.5"></a>
  <img src="https://img.shields.io/badge/Bun-Supported-white?logo=bun&logoColor=white&labelColor=black&style=flat-square" alt="Bun">
  <img src="https://img.shields.io/badge/Node.js-Supported-white?logo=node.js&logoColor=5FA04E&labelColor=black&style=flat-square" alt="Node.js">
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

## Installation

```bash
# Direct Package:
npm install openliate
# or Org-Scoped Package:
npm install @openliate/liate

# or via Bun:
bun add openliate
```

---

## Quickstart: The Frontier Agent (`SovereignAgent`)

Every agent is declared natively as a TypeScript class inheriting from `liate`. The 5 layers map 1-to-1 to NVIDIA CEO Jensen Huang's 5 foundational agent elements:

```typescript
import { liate } from "openliate";
// or if using the org-scoped package:
// import { liate } from "@openliate/liate";

export class SovereignAgent extends liate {
  L = "sarvam/sarvam-105b";                         // [L] Large Models Layer (Sarvam Indic 105B)
  I = { memory: "sessions/sovereign-agent" };       // [I] Integration & Memory Layer
  A = {                                             // [A] Agent Harness Layer
    name: "agentyaan",
    intent: "Autonomous Sovereign Indic Agent",
    maxSteps: 5
  };
  T = {                                             // [T] Tools & MCP Layer (Stdio & SSE)
    fetch: {
      command: "uvx",
      args: ["mcp-server-fetch"],
      tools: ["*"]
    }
  };
  E = { SARVAM_API_KEY: "$SARVAM_API_KEY" };        // [E] Environment & Sandbox Layer
}

// Run the agent via the autonomous ReAct loop:
const agent = new SovereignAgent();
const result = await agent.run("Fetch https://openliate.tech and summarize.");
console.log(result.text);
```

---

## Instant Run (Zero Install)

Run any agent directly without installation using `npx`:

```bash
npx openliate run agent.ts "Fetch https://openliate.tech and summarize"
```

---

## The 5 Layers (L · I · A · T · E)

| Layer | Name | Description |
| :--- | :--- | :--- |
| **`L`** | **Large Models** | Universal routing to Sarvam AI (`sarvam-105b`, `sarvam-30b`), Ollama local, or OpenRouter with fallback cascade. |
| **`I`** | **Integration** | Sovereign memory sessions, vector knowledge graphs, and local execution state. |
| **`A`** | **Agent Harness** | Autonomous ReAct loop with max-steps safeguards and self-healing error recovery. |
| **`T`** | **Tools & MCP** | Native Anthropic Model Context Protocol (MCP) clients over stdio and SSE protocols. |
| **`E`** | **Environment** | Sandboxed environment isolation and secure secret injection. |

---

## CLI Reference

| Command | Action |
| :--- | :--- |
| `openliate run [file] <prompt>` | Execute agent with a prompt |
| `openliate chat [file]` | Start interactive multi-turn REPL session |
| `openliate serve [--port]` | Launch high-performance Hono HTTP/SSE edge runtime |
| `openliate create <name>` | Scaffold a new agent project |
| `openliate hub` | List prebuilt agent templates |

---

<div align="center">

**[Documentation](https://openliate.tech/docs)** · **[Website](https://openliate.tech)** · **[GitHub](https://github.com/OpenLiate/Liate)**

Built with ❤️ from India, for India, and beyond India 🇮🇳 🌍

</div>
