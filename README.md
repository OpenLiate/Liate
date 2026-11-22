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
  <a href="https://github.com/OpenLiate/Liate/releases"><img src="https://img.shields.io/badge/version-v0.2.0-white?labelColor=black&style=flat-square" alt="v0.2.0"></a>
  <img src="https://img.shields.io/badge/Bun-Supported-white?logo=bun&logoColor=white&labelColor=black&style=flat-square" alt="Bun">
  <img src="https://img.shields.io/badge/Node.js-Supported-white?logo=node.js&logoColor=5FA04E&labelColor=black&style=flat-square" alt="Node.js">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openliate"><img src="https://img.shields.io/npm/dw/openliate?logo=npm&logoColor=CB3837&label=openliate&labelColor=black&color=white&style=flat-square" alt="npm openliate"></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/@openliate/liate"><img src="https://img.shields.io/npm/dw/@openliate/liate?logo=npm&logoColor=CB3837&label=%40openliate%2Fliate&labelColor=black&color=white&style=flat-square" alt="npm @openliate/liate"></a>
  &nbsp;&bull;&nbsp;
  <a href="https://pypi.org/project/liate/"><img src="https://img.shields.io/badge/liate-v0.2.0-white?logo=pypi&logoColor=FFD43B&label=liate&labelColor=black&color=white&style=flat-square" alt="PyPI liate"></a>
  &nbsp;
  <a href="https://pypi.org/project/openliate/"><img src="https://img.shields.io/badge/openliate-v0.2.0-white?logo=pypi&logoColor=FFD43B&label=openliate&labelColor=black&color=white&style=flat-square" alt="PyPI openliate"></a>
  &nbsp;&bull;&nbsp;
  <a href="#traction"><img src="https://img.shields.io/endpoint?url=https%3A%2F%2Fgist.githubusercontent.com%2Fvinodhatti%2F4e50442b9bc06000069dd0c1552ab66b%2Fraw%2Fdownloads.json&style=flat-square&labelColor=black" alt="Total Downloads"></a>
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

<br>

> ### *"If Stripe did payments in 7 lines of code, why not AI Agents in 5 lines of code?*  
> **BaaA — Backend-as-an-Agent.**  
> *From India, For India, Beyond India. Let's Try Liate."*

</div>

## <a id="instant-install"></a>[0] Quickstart & Local Run

### 1-Click Fast Install:

```powershell
# Windows (PowerShell)
powershell -c "irm https://openliate.tech/install.ps1 | iex"
```

```bash
# macOS / Linux (Bash)
curl -fsSL https://openliate.tech/install.sh | bash
```

```bash
# Node / Bun Global Install:
npm install -g openliate
# or
bun add -g openliate

# Python SDK:
pip install liate
```

### Run Agents:

```bash
# Run a Local Hub Agent:
liate run sarvam-agent "Hello Agent"

# Run any custom agent.json:
liate run ./path/to/agent.json "Hello Agent"

# Start an interactive chat session:
liate chat sarvam-agent

# List all available local agents in Hub:
liate hub

# Start Edge Runtime Server (Hono HTTP Port 7071):
liate serve --port 7071
```

> **Prefer 1-Click in Browser?**  
> Run OpenLiate instantly inside [GitHub Codespaces](https://codespaces.new/openliate/openliate) with zero local setup.


> **Why 5 Lines? The AI Agent Architecture:**  
> An AI Agent is fundamentally 5 layers: **LLM (`L`)**, **Integration (`I`)**, **Agent (`A`)**, **Tools (`T`)**, and **Environment (`E`)**. OpenLiate maps this directly into 5 lines of declarative execution.

```jsonc
{
  "L": "sarvam/sarvam-105b",                                                          // [L] LLM: Sarvam AI 105B Indic Model (Sarvam Startup Program 2026)
  "I": { 
    "memory": "sessions/agentyaan"                                                    // [I] Integration: Co-located Persistent Session State
  },
  "A": { 
    "name": "agentyaan", 
    "version": "0.2.0",                                                               // [A] Agent: Identity, Version & ReAct Reasoning Loop
    "intent": "Frontier Sovereign AI Agent · Built on Liate · Selected for Sarvam AI Startup Program 2026 · Exa.ai Startup Program (YC S21)", 
    "maxSteps": 5 
  },
  "T": {                                                                              // [T] Tools: Model Context Protocol (Anthropic MCP v2 Stdio & Remote SSE)
    "sarvam_ai": {
      "command": "uvx",
      "args": ["sarvam-mcp"],
      "tools": ["*"]
    }
  },
  "E": { 
    "SARVAM_API_KEY": "$SARVAM_API_KEY"                                              // [E] Environment: Enterprise Sandbox Guardrails & Keys
  }
}
```

```bash
# Execute your frontier agent (reads L·I·A·T·E directly from agent.json)
liate run agent.json "Introduce Mission AgentYaan and explain why sovereign OOP AI agents matter for India."
```

> **Class is an Agent — Developer SDKs:**  
> - **CLI & Runtime Engine:** `npm install -g openliate` or `bun add -g openliate`  
> - **Python SDK:** `pip install liate`  
> - **TypeScript SDK:** `npm install @openliate/liate` (or `openliate`)  
> OpenLiate natively executes declarative **`agent.json`** agents directly via the `liate` CLI.

<br>

---

## <a id="benchmarks"></a>[1] High-Performance Runtime & Benchmarks (v0.2.0)

OpenLiate is engineered from the ground up on native **Object-Oriented Programming (OOP)** classes instead of heavy directed acyclic graph (DAG) pipelines and chain polyfills.

### #1 Real Hardware Benchmark: OpenLiate vs. Legacy Frameworks

Measured on real hardware with zero mocks (`bun benchmark_runtime.ts`):

| Metric | OpenLiate (Liate OOP) | LangChain (AgentExecutor) | CrewAI (Python) |
| :--- | :--- | :--- | :--- |
| **Language** | **TypeScript (Bun / Node)** | TypeScript | Python |
| **Framework Boot Overhead** | **31.86 µs – 45.70 µs (0.03 ms)** | ~85,000 µs (85 ms) | ~210,000 µs (210 ms) |
| **Throughput (Agents / sec)** | **Up to 31,386 ops/sec** | ~12 ops/sec | ~5 ops/sec |
| **Cold Start Footprint** | **< 25 KB** | > 18 MB | > 45 MB |
| **Architecture** | **Zero-Dependency OOP (L.I.A.T.E)** | Chained Graphs & Polyfills | Multi-threaded Process Pool |

> **Result:** OpenLiate is **over 1,860x to 2,668x FASTER** in framework boot overhead than LangChain, enabling **31,000+ autonomous agent instances** to spin up per second on consumer hardware. See full reproducible benchmark report in [`benchmark/README.md`](./benchmark/README.md).

### #2 The 7 Classical OOP Paradigms in OpenLiate (`benchmark_oop.ts`)

OpenLiate is the first agent runtime to formally map autonomous AI agents to all 7 classical Object-Oriented Programming (OOP) paradigms:

1. **Class:** `class MyAgent extends liate { L; I; A; T; E; }` — Declarative agent blueprint.
2. **Object:** `new MyAgent()` — Independent instance with co-located session memory & identity.
3. **Inheritance:** Specialized agents subclassing base agents to inherit models & tools while overriding intent.
4. **Polymorphism:** Heterogeneous agent swarms typed as `liate[]` dispatched via a single `.run()` interface.
5. **Encapsulation:** Sandboxed `E` environment variables & isolated session state.
6. **Abstraction:** Complex ReAct reasoning loops, retries, and token streaming hidden behind one high-level `.run(prompt)` method.
7. **Composition:** Master agents composing specialized worker agents directly as sub-agent tools.

<br>

---

## <a id="traction"></a>[2] Real Production Ecosystem Traction

Verified multi-registry telemetry across npm and official PyPI statistics (`pypistats.org`):

| Registry | Package Distribution | Total Downloads | Verified Clean Installs (`without_mirrors`) | Telemetry Source |
| :--- | :--- | :--- | :--- | :--- |
| **npm** | [`openliate`](https://www.npmjs.com/package/openliate) | **949+** | Direct Developer CLI & Agent Runners | [npmjs.com/package/openliate](https://www.npmjs.com/package/openliate) |
| **npm** | [`@openliate/liate`](https://www.npmjs.com/package/@openliate/liate) | **848+** | TypeScript SDK Imports | [npmjs.com/package/@openliate/liate](https://www.npmjs.com/package/@openliate/liate) |
| **PyPI** | [`openliate`](https://pypi.org/project/openliate/) | **848+** | **848+** (Clean Human Installs) | [pypistats.org/packages/openliate](https://pypistats.org/packages/openliate) |
| **PyPI** | [`liate`](https://pypi.org/project/liate/) | **619+** | **619+** (Clean Human Installs) | [pypistats.org/packages/liate](https://pypistats.org/packages/liate) |
| **Global** | **Combined Ecosystem** | **3,264+ Total Installs** | **1,460+ Direct Human Installs** | **100% Cryptographic OIDC Provenance** |

<br>

---

<div align="center">

### Sovereign AI Agent Execution: Function is an Agent.
#### *Run Locally or Deploy Anywhere — Free Forever.*

<br>

## **Class is an Agent. Agent is a Function. Function is an API.**

#### *Agent Protocol Interface (Liate API) Architecture*

</div>

<br>

Write your agent directly in code. OpenLiate maps the 5 layers (`L · I · A · T · E`) into clean OOP classes—available interchangeably in shorthand (`L, I, A, T, E`) or full-name (`LLM, Integration, Agent, Tools, Environment`):

<br>

#### 1. TypeScript & JavaScript SDK (`@openliate/liate` / `openliate`)

```typescript
// agent.ts
import { liate } from "@openliate/liate";

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

  // [I] Integration: Co-located Persistent Session State
  I = { 
    memory: "sessions/agentyaan" 
  };

  // [A] Agent Harness: Identity, ReAct Reasoning Loop & Intent
  A = { 
    name: "agentyaan", 
    version: "0.2.0", 
    intent: "Frontier Sovereign AI Agent · Built on Liate · Selected for Sarvam AI Startup Program 2026 · Exa.ai Startup Program (YC S21)", 
    maxSteps: 5 
  };

  // [T] Tools: Model Context Protocol (Anthropic MCP v2 stdio uvx/npx & Remote HTTP/SSE)
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

  // [E] Environment: Enterprise Sandbox Guardrails & Secret Masking
  E = { 
    SARVAM_API_KEY: "$SARVAM_API_KEY",
    BOLNA_API_KEY: "$BOLNA_API_KEY",
    GNANI_API_KEY: "$GNANI_API_KEY",
    NEON_API_KEY: "$NEON_API_KEY"
  };
}

// Run in-process:
const agent = new FrontierAgent();
const result = await agent.run("Introduce Mission AgentYaan and explain why sovereign OOP AI agents matter for India.");
console.log(result.text);

// Or convert to a standard Web API handler:
export const POST = agent.toHandler();
```

```bash
# Execute your TypeScript agent directly:
bun run agent.ts
```

<br>

#### 2. Python SDK (`liate` / `openliate`)

```python
# agent.py
from liate import liate

class FrontierAgent(liate):
    # [L] Large Models: Native Routing across Sovereign & 65+ Frontier AI Models:
    # - "sarvam/sarvam-105b" (Sarvam AI Indic Foundation Model - Startup Program 2026)
    # - "sarvam/sarvam-prism" (Sarvam AI Nov 2026 Frontier Decision & System-1 LoRA Model ~44ms)
    # - "sarvam/sarvam-30b" | "sarvam/bulbul-v4" | "sarvam/saaras-v4"
    # - "gnani/prisma-v3" (Gnani AI STT 10+ Indic Languages) | "gnani/timbre-v3" (Gnani AI TTS Multilingual)
    # - "neon/gemini-2.5-pro" | "neon/gemini-2.5-flash" (Google Gemini Frontier Series)
    # - "neon/claude-3-7-sonnet" | "neon/claude-3-5-haiku" (Anthropic Frontier Series)
    # - 65+ Frontier AI Models via Neon AI Gateway with JEV System-One Heuristic Routing
    L = "sarvam/sarvam-105b"

    # [I] Integration: Co-located Persistent Session State
    I = {
        "memory": "sessions/agentyaan"
    }

    # [A] Agent Harness: Identity, ReAct Reasoning Loop & Intent
    A = {
        "name": "agentyaan",
        "version": "0.2.0",
        "intent": "Frontier Sovereign AI Agent · Built on Liate · Selected for Sarvam AI Startup Program 2026 · Exa.ai Startup Program (YC S21)",
        "maxSteps": 5
    }

    # [T] Tools: Model Context Protocol (Anthropic MCP v2 stdio uvx/npx & Remote HTTP/SSE)
    T = {
        # Local Stdio MCP: Sarvam AI Indic STT, TTS & Document tools
        "sarvam_ai": {
            "command": "uvx",
            "args": ["sarvam-mcp"],
            "tools": ["*"]
        },
        # Remote Hosted MCP: Bolna AI (YC-backed Voice Agent & Telephony Orchestration)
        "bolna_voice": {
            "url": "https://mcp.bolna.ai/api/mcp",
            "headers": {
                "Authorization": "Bearer $BOLNA_API_KEY"
            },
            "tools": ["*"]
        }
    }

    # [E] Environment: Enterprise Sandbox Guardrails & Secret Masking
    E = {
        "SARVAM_API_KEY": "$SARVAM_API_KEY",
        "BOLNA_API_KEY": "$BOLNA_API_KEY",
        "GNANI_API_KEY": "$GNANI_API_KEY",
        "NEON_API_KEY": "$NEON_API_KEY"
    }

# Run via Liate API engine:
agent = FrontierAgent()
result = agent.run("Introduce Mission AgentYaan and explain why sovereign OOP AI agents matter for India.")
print(result.response)
```

```bash
# Execute your Python agent directly:
python agent.py
```

> **Full-Name Support:** Prefer self-documenting property names? Both SDKs and `agent.json` natively accept:  
> `LLM` · `Integration` · `Agent` · `Tools` · `Environment` (or lowercase `llm`, `integration`, `agent`, `tools`, `environment`).

---

## <a id="runtime-engine"></a>[3] Core Runtime Engine: OM (Orchestration Module)

**Liate's Orchestration Module (OM) is the runtime engine** — just like Docker executes containers and Ollama executes models, **Liate executes AI agents via OM** across the 5 layers (`L · I · A · T · E`).

Liate provides sovereign, zero-dependency execution across local hardware and containerized environments:

---

### #1 Run Locally (Native CLI & Hub)

Run agents anywhere on your own hardware with zero external dependencies:

```bash
# 1. Native Standalone CLI
liate run hub/agents/sarvam-agent "Namaste!"

# 2. Local Edge Runtime Server (Hono HTTP Port 7071)
liate serve --port 7071
```

* **MCP Tools:** Execute local Stdio MCP tools (`npx`, `uvx`) and remote HTTP/SSE endpoints.
* **100% Offline & Private:** Zero cloud dependencies, zero external network hops, zero telemetry.
* **Your Keys:** Reads `$SARVAM_API_KEY` directly from your local `.env`.
* **Universal:** Run locally on macOS, Linux, Windows, or Docker containers.

---

### #2 Local Edge Runtime Server (Port 7071)

OpenLiate includes a lightweight edge runtime server powered by Hono on port `7071`:

```bash
# Start edge server:
liate serve --port 7071

# Health check:
curl http://localhost:7071/health
```

#### Invoke via HTTP

```bash
# Run agent via HTTP:
curl -X POST http://localhost:7071/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Namaste! Introduce yourself."
  }'

# Multi-turn chat session:
curl -X POST http://localhost:7071/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-1",
    "message": "Can you help me build an agent?"
  }'
```

---

## <a id="aum-architecture"></a>[4] Architecture: The 5 Layers (AUM)

### #1 Industry Architecture Parity: NVIDIA Keynote 2026

In the **NVIDIA Keynote 2026**, NVIDIA CEO Jensen Huang defined the five foundational elements of an autonomous agent:  
> *"AI Factories Produce Intelligence. Agents Put Intelligence to Work... Model, Knowledge, Tools, Sandbox, Harness — These are the five elements of an agent."*

OpenLiate is engineered ground-up with 1-to-1 fidelity to this 5-element architecture:

| 5 Elements of an Agent (NVIDIA Keynote 2026) | Liate Layer (L · I · A · T · E) | Production File | Architecture Role |
| :--- | :--- | :--- | :--- |
| **[1] Model** | **`[L]` LLM** | `src/layers/llm/model.ts` | Native model routing across Sarvam 105B & 65+ models |
| **[2] Knowledge** | **`[I]` Integration** | `src/layers/integration/knowledge.ts` | Persistent session memory & vector document context |
| **[3] Harness** | **`[A]` Agent** | `src/layers/agent/harness.ts` | ReAct autonomous reasoning loop & agent harness |
| **[4] Tools** | **`[T]` Tools** | `src/layers/tools/mcp.ts` | Anthropic Model Context Protocol (MCP v2) stdio & SSE |
| **[5] Sandbox** | **`[E]` Environment** | `src/layers/environment/sandbox.ts` | Isolated execution sandbox guardrails & secret masking |

<br>

### #2 The 5 Layers Specification Matrix (AUM)

Every agent implements the **Agent Unified Module (AUM)** across 5 sovereign layers declared as module keys or class properties:

| Layer | Name | Core (Built-in) | Community Extensibility |
|---|---|---|---|
| **L** | **LLM** | Direct provider routing: Sarvam AI Sovereign Models (2026) <sup>IN</sup> | Custom LLM providers & OpenAI-compatible gateways... |
| **I** | **Integration** | In-memory state, persistent file session memory, local integrations | Vector stores, local databases, custom hooks... |
| **A** | **Agent** | Name, intent, ReAct loop, autonomous reasoning | Custom agent personas & domain instructions... |
| **T** | **Tools** | Model Context Protocol (MCP v2 Local Stdio `uvx`/`npx` & Remote HTTP/SSE) | Custom MCP servers, filesystem, developer tools... |
| **E** | **Environment** | Pure `.env` key reader & execution configuration | Custom secrets loaders, runtime environment configs... |

> **Universal Agent Standards:** Liate natively implements Anthropic's **Model Context Protocol (MCP v2)** (modular tools and actuators in Layer **[T]**) and sovereign 5 Elements architecture. Zero glue code required.

<br>

> **In Tech History, These Acronyms Defined Entire Eras:**  
> * **LAMP** Stack *(Linux · Apache · MySQL · PHP)* &rarr; Defined the Web 1.0 era.  
> * **MERN** Stack *(MongoDB · Express · React · Node)* &rarr; Defined the Web 2.0 era.  
> * **REST** *(Representational State Transfer)* &rarr; Defined the API era.  
> * **LIATE** *(LLM · Integration · Agent · Tools · Environment)* &rarr; **Defines the AI Agent Era.**

---

## [5] License

[MIT](LICENSE) © 2026 OpenLiate. Free and open source forever.

<br>

<div align="center">

**LIATE — Open Source OOP Framework for AI Agents**

<br>

Built from India to the World

</div>
