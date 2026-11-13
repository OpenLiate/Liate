<div align="center">

# OpenLiate — Open Source Backend Layer for AI Agents
### Where a Class is an Agent · From India, For India, Beyond India 🇮🇳 🌍

`L[LM] · I[ntegration] · A[gent] · T[ools] · E[nvironment]`

<br>

<p align="center">
  <a href="https://docs.openliate.tech"><img src="https://img.shields.io/badge/docs-docs.openliate.tech-white?labelColor=black&style=flat-square&v=2" alt="Docs"></a>
  <a href="https://github.com/OpenLiate/Liate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square" alt="License: MIT"></a>
  <a href="https://sarvam.ai"><img src="./assets/sarvam-badge.svg" alt="Startup Program: Sarvam AI"></a>
  <a href="https://codespaces.new/OpenLiate/Liate"><img src="https://img.shields.io/badge/Codespaces-1--Click_Run-white?logo=github&logoColor=white&labelColor=black&style=flat-square" alt="Open in GitHub Codespaces"></a>
  <a href="https://github.com/OpenLiate/Liate/releases"><img src="https://img.shields.io/badge/version-v0.1.2-white?labelColor=black&style=flat-square" alt="v0.1.2"></a>
  <img src="https://img.shields.io/badge/Bun-Supported-white?logo=bun&logoColor=white&labelColor=black&style=flat-square" alt="Bun">
  <img src="https://img.shields.io/badge/Node.js-Supported-white?logo=node.js&logoColor=5FA04E&labelColor=black&style=flat-square" alt="Node.js">
</p>

<p align="center">
  <a href="#aum-architecture"><img src="https://img.shields.io/badge/Agent_Architecture-AUM_(Agent_Unified_Module)-white?labelColor=black&style=flat-square" alt="Agent Unified Module (AUM)"></a>
  &nbsp;
  <a href="#runtime-engine"><img src="https://img.shields.io/badge/Core_Runtime_Engine-OM_(Orchestration_Module)-white?labelColor=black&style=flat-square" alt="Core Runtime Engine: OM (Orchestration Module)"></a>
  &nbsp;
  <a href="#instant-install"><img src="https://img.shields.io/badge/Instant_Install-Zero_Dependencies-white?labelColor=black&style=flat-square" alt="Instant Install"></a>
</p>

<br>

> **Milestone: Liate — Selected for India's Sarvam AI Startup Program 2026** <sup>IN</sup>  
> Open Source Backend Layer for AI Agents by [OpenLiate](https://github.com/OpenLiate/Liate)

<br>

> ### *"If Stripe did payments in 7 lines of code, why not AI Agents in 5 lines of code?*  
> **BaaA — Backend-as-an-Agent.**  
> *From India, For India, Beyond India. Let's Try Liate."*

</div>

## <a id="instant-install"></a>[0] Quickstart & Local Run

```bash
# Run a Local Hub Agent:
liate run sarvam-agent "Hello World"

# Run any custom agent.json:
liate run ./path/to/agent.json "Hello World"

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
  "L": "sarvam/sarvam-105b-conversations",                                            // [L] LLM: Sarvam AI Sovereign Indic Models (2026)
  "I": { 
    "memory": "sessions/liate-agent"                                                  // [I] Integration: Session Memory & State
  },
  "A": { 
    "name": "liate-agent", 
    "version": "0.0.1",                                                               // [A] Agent: Identity, Version & ReAct Loop
    "intent": "Autonomous Sovereign Agent powered by Sarvam AI", 
    "maxSteps": 5 
  },
  "T": {                                                                              // [T] Tools: Model Context Protocol (MCP v2 Local Stdio & Remote SSE)
    "time": {
      "command": "uvx",
      "args": ["mcp-server-time"],
      "tools": ["*"]
    }
  },
  "E": { 
    "SARVAM_API_KEY": "$SARVAM_API_KEY"                                              // [E] Environment: Secrets & API Keys
  }
}
```

```bash
# Execute your agent (reads L·I·A·T·E directly from agent.json)
liate run agent.json "Hello Agent World!"
```

> **Class is an Agent — Developer SDKs (Coming Soon):**  
> Direct language SDKs for **TypeScript / JavaScript** (`npm install @openliate/liate`) and **Python** (`pip install liate`) are coming soon.  
> Right now, OpenLiate natively executes declarative **`agent.json`** agents directly via the `liate` CLI.

<br>

---

<div align="center">

### Sovereign AI Agent Execution: Function is an Agent.
#### *Run Locally or Deploy Anywhere — Free Forever.*

<br>

## **Class is an Agent. Agent is a Function. Function is an API. (Coming Soon)**

#### *Agent Protocol Interface (Liate API) Architecture*

</div>

<br>

Write your agent directly in code. OpenLiate maps the 5 layers (`L · I · A · T · E`) into clean OOP classes—available interchangeably in shorthand (`L, I, A, T, E`) or full-name (`LLM, Integration, Agent, Tools, Environment`):

<br>

#### 1. TypeScript & JavaScript SDK (Coming Soon)

```typescript
// agent.ts
import { liate } from "@openliate/liate";

export class LiateAgent extends liate {
  L = "sarvam/sarvam-105b-conversations";                                             // [L] LLM: Sarvam AI Sovereign Models
  I = { 
    memory: "sessions/liate-agent"                                                    // [I] Integration: Co-located Session State
  };
  A = { 
    name: "liate-agent", 
    version: "0.0.1", 
    intent: "Autonomous Sovereign Agent powered by Sarvam AI", 
    maxSteps: 5                                                                       // [A] Agent: Identity & ReAct Loop
  };
  T = {                                                                              // [T] Tools: Model Context Protocol (MCP v2)
    time: {
      command: "uvx",
      args: ["mcp-server-time"],
      tools: ["*"]
    }
  };
  E = { 
    SARVAM_API_KEY: "$SARVAM_API_KEY"                                                // [E] Environment: Secrets & API Keys
  };
}

// Run in-process:
const agent = new LiateAgent();
const result = await agent.run("Hello Agent World!");
console.log(result.text);

// Or convert to a standard Web API handler:
export const POST = agent.toHandler();
```

```bash
# Execute your TypeScript agent directly:
bun run agent.ts
```

<br>

#### 2. Python SDK (Coming Soon)

```python
# agent.py
from liate import liate

class LiateAgent(liate):
    L = "sarvam/sarvam-105b-conversations"                                            # [L] LLM: Sarvam AI Sovereign Models
    I = {
        "memory": "sessions/liate-agent"                                              # [I] Integration: Co-located Session State
    }
    A = {
        "name": "liate-agent",
        "version": "0.0.1",
        "intent": "Autonomous Sovereign Agent powered by Sarvam AI",
        "maxSteps": 5                                                                 # [A] Agent: Identity & ReAct Loop
    }
    T = {                                                                             # [T] Tools: Model Context Protocol (MCP v2)
        "time": {
            "command": "uvx",
            "args": ["mcp-server-time"],
            "tools": ["*"]
        }
    }
    E = {
        "SARVAM_API_KEY": "$SARVAM_API_KEY"                                          # [E] Environment: Secrets & API Keys
    }

# Run via Liate API engine:
agent = LiateAgent()
result = agent.run("Hello Agent World!")
print(result.response)
```

```bash
# Execute your Python agent directly:
python agent.py
```

> **Full-Name Support:** Prefer self-documenting property names? Both SDKs and `agent.json` natively accept:  
> `LLM` · `Integration` · `Agent` · `Tools` · `Environment` (or lowercase `llm`, `integration`, `agent`, `tools`, `environment`).

---

## <a id="runtime-engine"></a>[1] Core Runtime Engine: OM (Orchestration Module)

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

## <a id="aum-architecture"></a>[2] Architecture: The 5 Layers (AUM)

Every agent implements the **Agent Unified Module (AUM)** across 5 sovereign layers declared as module keys or class properties:

| Layer | Name | Core (Built-in) | Community Extensibility |
|---|---|---|---|
| **L** | **LLM** | Direct provider routing: Sarvam AI Sovereign Models (2026) <sup>IN</sup> | Custom LLM providers & OpenAI-compatible gateways... |
| **I** | **Integration** | In-memory state, persistent file session memory, local integrations | Vector stores, local databases, custom hooks... |
| **A** | **Agent** | Name, intent, ReAct loop, autonomous reasoning | Custom agent personas & domain instructions... |
| **T** | **Tools** | Model Context Protocol (MCP v2 Local Stdio `uvx`/`npx` & Remote HTTP/SSE) | Custom MCP servers, filesystem, developer tools... |
| **E** | **Environment** | Pure `.env` key reader & execution configuration | Custom secrets loaders, runtime environment configs... |

> **Universal Agent Standards:** Liate natively implements Anthropic's **Model Context Protocol (MCP v2)** (modular tools and actuators in Layer **[T]**) and sovereign 5 Elements architecture. Zero glue code required.

---

## [3] License

[MIT](LICENSE) © 2026 OpenLiate. Free and open source forever.

<br>

<div align="center">

**OpenLiate — Open Source Backend Layer for AI Agents**

<br>

Built with ❤️ from India to the World

</div>
