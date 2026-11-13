<div align="center">

# OpenLiate — Open Source Backend Layer for AI Agents
### Python SDK (`liate`) · Where a Class is an Agent · From India, For India, Beyond India 🇮🇳 🌍

`L[LM] · I[ntegration] · A[gent] · T[ools] · E[nvironment]`

<br>

<p align="center">
  <a href="https://docs.openliate.tech"><img src="https://img.shields.io/badge/docs-docs.openliate.tech-white?labelColor=black&style=flat-square&v=2" alt="Docs"></a>
  <a href="https://github.com/OpenLiate/Liate/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square" alt="License: MIT"></a>
  <a href="https://sarvam.ai"><img src="./assets/sarvam-badge.svg" alt="Startup Program: Sarvam AI"></a>
  <a href="https://neon.tech"><img src="https://img.shields.io/badge/Neon-Cloud_%26_AI_Gateway_Credits-white?logo=neon&logoColor=00E59B&labelColor=black&style=flat-square" alt="Neon Cloud & AI Gateway Credits"></a>
  <a href="https://codespaces.new/OpenLiate/Liate"><img src="https://img.shields.io/badge/Codespaces-1--Click_Run-white?logo=github&logoColor=white&labelColor=black&style=flat-square" alt="Open in GitHub Codespaces"></a>
  <a href="https://github.com/OpenLiate/Liate/releases"><img src="https://img.shields.io/badge/version-v0.1.2-white?labelColor=black&style=flat-square" alt="v0.1.2"></a>
  <img src="https://img.shields.io/badge/Bun-Supported-white?logo=bun&logoColor=white&labelColor=black&style=flat-square" alt="Bun">
  <img src="https://img.shields.io/badge/Node.js-Supported-white?logo=node.js&logoColor=5FA04E&labelColor=black&style=flat-square" alt="Node.js">
  <img src="https://img.shields.io/badge/Deno-Supported-white?logo=deno&logoColor=white&labelColor=black&style=flat-square" alt="Deno">
</p>

<p align="center">
  <a href="#aum-architecture"><img src="https://img.shields.io/badge/Agent_Architecture-AUM_(Agent_Unified_Module)-white?labelColor=black&style=flat-square" alt="Agent Unified Module (AUM)"></a>
  &nbsp;
  <a href="#runtime-engine"><img src="https://img.shields.io/badge/Core_Runtime_Engine-OM_(Orchestration_Module)-white?labelColor=black&style=flat-square" alt="Core Runtime Engine: OM (Orchestration Module)"></a>
  &nbsp;
  <a href="#instant-install"><img src="https://img.shields.io/badge/Instant_Install-Zero_Dependencies-white?labelColor=black&style=flat-square" alt="Instant Install"></a>
  &nbsp;
  <a href="https://skills.sh"><img src="https://img.shields.io/badge/Agent_Skills-1.26M%2B_skills.sh_(Live)-white?labelColor=black&logo=vercel&logoColor=white&style=flat-square" alt="1.26M+ skills.sh"></a>
</p>

<br>

> **#1 Milestone: Liate — Selected for India's Sarvam AI Startup Program 2026** <sup>IN</sup>  
> Open Source Backend Layer for AI Agents by [OpenLiate](https://github.com/OpenLiate/Liate) · Creator [@gitdevinod](https://github.com/gitdevinod)
> 
> **#2 Milestone: Neon Cloud Developer Runway — Compute & AI Gateway Credits** <sup>CLOUD</sup>  
> Powering serverless Postgres compute, 63-model AI Gateway routing, and sovereign agent execution · [Neon Cloud](https://neon.tech)

<br>

> ### *"If Stripe did payments in 7 lines of code, why not AI Agents in 5 lines of code?*  
> **BaaA — Backend-as-an-Agent.**  
> *From India, For India, Beyond India. Let's Try Liate."*

</div>

## <a id="instant-install"></a>[0] Instant Install (Zero Dependencies)

```bash
# 1-Click Run via npx (Zero local install):
npx @openliate/liate run agent.json "Hello World"

# Or Install Globally:
npm install -g @openliate/liate

# Instant command:
liate run agent.json "Hello World"

# Windows (PowerShell):
powershell -c "irm https://openliate.tech/install.ps1 | iex"

# macOS / Linux (cURL):
curl -fsSL https://openliate.tech/install.sh | sh
```

> **Prefer 1-Click in Browser?**  
> Run OpenLiate instantly inside [GitHub Codespaces](https://codespaces.new/openliate/openliate) with zero local setup.


> **Why 5 Lines? The AI Agent Architecture:**  
> An AI Agent is fundamentally 5 layers: **LLM (`L`)**, **Integration (`I`)**, **Agent (`A`)**, **Tools (`T`)**, and **Environment (`E`)**. OpenLiate maps this directly into 5 lines of declarative execution.

```jsonc
{
  "L": "sarvam/sarvam-105b",                                                          // [L] LLM: Sarvam AI Token Factory (2026) & Neon AI Gateway (63+ Models)
  "I": { "memory": "sessions/hello-agent" },                                          // [I] Integration: Session Memory, State, npm Libraries, Git Repos
  "A": { "name": "hello_agent", "intent": "Autonomous Agent", "skills": ["vercel/nextjs"] }, // [A] Agent: Identity, Intent, Vercel skills.sh, ReAct Loop
  "T": {                                                                              // [T] Tools: Model Context Protocol (MCP v2 Local Stdio & Remote SSE)
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"],
      "tools": ["*"]
    }
  },
  "E": { "SARVAM_API_KEY": "$SARVAM_API_KEY" }                                        // [E] Environment: Secrets & Security Config
}
```

```bash
# Execute your agent (reads L·I·A·T·E directly from agent.json)
liate run agent.json "Hello Agent World!"
```

> **Prefer writing code directly?**  
> Direct language SDKs for **TypeScript / JavaScript** (`npm install openliate`) and **Python** (`pip install openliate`) are live on **v0.1.0**.  
> Write your agent in 5 properties: **`class extends liate`**.

<br>

---

<div align="center">

### Sovereign AI Agent Execution: Function is an Agent.
#### *Self-Host Anywhere on Bare Metal, Docker, or Serverless — Free Forever.*

<br>

## **Class is an Agent. Agent is a Function. Function is an API.**

#### *Agent Protocol Interface (Liate API) is Your Backend.*

</div>

<br>

Write your agent directly in code. OpenLiate maps the 5 layers (`L · I · A · T · E`) into clean OOP classes—available interchangeably in shorthand (`L, I, A, T, E`) or full-name (`LLM, Integration, Agent, Tools, Environment`):

<br>

#### 1. TypeScript & JavaScript SDK (`npm install @openliate/liate`)

```typescript
// agent.ts
import { liate } from "@openliate/liate";

export class HelloAgent extends liate {
  L = "sarvam/sarvam-105b";                                                          // [L] LLM: Sarvam AI Token Factory (2026) & Neon AI Gateway (63+ Models)
  I = { memory: "sessions/hello-agent" };                                             // [I] Integration: Co-located Session State
  A = { name: "hello_agent", intent: "Autonomous Sovereign Agent" };                 // [A] Agent: Identity & ReAct Loop
  T = {                                                                              // [T] Tools: Model Context Protocol (MCP v2)
    fetch: {
      command: "uvx",
      args: ["mcp-server-fetch"],
      tools: ["*"]
    }
  };
  E = { SARVAM_API_KEY: "$SARVAM_API_KEY" };                                         // [E] Environment: Secrets & API Keys
}

// Run in-process:
const agent = new HelloAgent();
const result = await agent.run("Hello Agent World!");
console.log(result.text);

// Or convert to a standard Web API handler (Hono / Vercel / Cloudflare):
export const POST = agent.toHandler();
```

```bash
# Execute your TypeScript agent directly:
bun run agent.ts
```

<br>

#### 2. Python SDK (`pip install liate`)

```python
# agent.py
from liate import liate

class HelloAgent(liate):
    L = "sarvam/sarvam-105b"                                                          # [L] LLM: Sarvam AI Token Factory (2026) & Neon AI Gateway (63+ Models)
    I = {"memory": "sessions/hello-agent"}                                            # [I] Integration: Co-located Session State
    A = {"name": "hello_agent", "intent": "Autonomous Sovereign Agent"}               # [A] Agent: Identity & ReAct Loop
    T = {                                                                             # [T] Tools: Model Context Protocol (MCP v2)
        "fetch": {
            "command": "uvx",
            "args": ["mcp-server-fetch"],
            "tools": ["*"]
        }
    }
    E = {"SARVAM_API_KEY": "$SARVAM_API_KEY"}                                        # [E] Environment: Secrets & API Keys

# Run via Liate API engine:
agent = HelloAgent()
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

Liate provides sovereign, zero-dependency deployment across local hardware, Docker containers, and standard serverless environments:

---

### #1 Run Locally (Native CLI & 1-Click Docker Engine)

Run agents anywhere on your own hardware with full Dual-MCP superpowers:

```bash
# 1. Native Standalone CLI
liate run agent.json "Hello Agent World!"

# 2. Local AI Gateway & Engine Server (OpenAI-Compatible Local Liate API Gateway /v1)
openliate serve --port 3000

# Connect Cursor, Claude Code, Cline, Copilot, or Python SDK to your local port:
export OPENAI_BASE_URL="http://localhost:3000/v1"
export OPENAI_API_KEY="any-key"

# 3. Production Docker Engine (Node 24 + Python 3.14 + Astral uv + npx)
docker compose up -d
```

* **Full Dual-MCP Support:** Execute both local Stdio MCP tools (`npx`, `uvx`) and remote HTTP/SSE MCP endpoints.
* **100% Offline & Private:** Zero cloud dependencies, zero external network hops, zero telemetry.
* **Your Keys:** Reads `$SARVAM_API_KEY` (or OpenAI/Claude) directly from your local `.env`.
* **Universal Deployment:** Run on your laptop, Mac/Linux/Windows, any VPS (DigitalOcean, Hetzner, AWS), or private Kubernetes cluster.

---

### #2 Universal Self-Host & Docker Deployment

Run OpenLiate anywhere on your own infrastructure with zero vendor lock-in:

```bash
# Production Docker Engine (Node 24 + Python 3.14 + Astral uv + npx)
docker compose up -d

# Verify engine health:
curl http://localhost:3000/health
```

* **Zero Cloud Lock-in:** Compute runs entirely under your control on your hardware, VPS, or private cluster.
* **Dual-MCP Transport:** Supports both local Stdio MCP tools (`uvx`, `npx`) and remote HTTP/SSE endpoints.
* **OpenAI-Compatible Gateway:** Exposes `/v1` endpoint for seamless integration with Cursor, Claude Code, Cline, Copilot, or any standard AI client.

---

### Invoke from Any App or Webhook via HTTP (Liate API)

#### 1. Universal cURL

```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello agent!",
    "L": "sarvam/sarvam-105b",
    "A": { "name": "sovereign_agent" }
  }'
```

#### 2. Node.js & Edge Fetch (`node -e`)

```javascript
node -e "
const url = 'http://localhost:3000/run';

const payload = {
  prompt: 'Check and list my inboxes using AgentMail tools.',
  sessionId: 'agentmail-session-1',
  L: 'sarvam/sarvam-105b',
  I: {
    memory: 'sessions/email-agent'
  },
  A: {
    name: 'email_agent',
    version: '0.0.1',
    intent: 'Autonomous Email Management Agent',
    maxSteps: 5
  },
  T: [
    'mcp:agentmail:list_inboxes,get_inbox,search_messages'
  ],
  E: {
    SARVAM_API_KEY: '\$SARVAM_API_KEY',
    AGENTMAIL_API_KEY: '\$AGENTMAIL_API_KEY'
  },
  keys: {
    SARVAM_API_KEY: process.env.SARVAM_API_KEY,
    AGENTMAIL_API_KEY: process.env.AGENTMAIL_API_KEY
  }
};

console.log('Invoking 5-line email-agent on Liate API:', url);

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
}).then(async res => {
  console.log('STATUS:', res.status);
  const text = await res.text();
  try {
    console.log('RESULT:\n', JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log('RAW BODY:\n', text);
  }
}).catch(console.error);
"
```

---

## [2] Benchmark of Liate Runtime Engine

Real empirical benchmarks measured live on `v0.1.0` standalone runtime engine against Sarvam 105B:

| Benchmark Metric | Measured Result | Environment & Notes |
|:---|:---|:---|
| **Hono Engine Cold Boot** | **`0.46 ms`** | Instant isolate startup |
| **Liate API Request Dispatch** | **`21.65 ms`** | `/run` JSON parsing & routing |
| **Sovereign LLM Latency** | **`3,866 ms`** | Sarvam 105B Reasoning (`sarvam-105b`) |
| **Token Generation Speed** | **`130.9 tok/s`** | 549 total tokens generated |
| **Full Pipeline Execution** | **`2,358 ms`** | Complete L · I · A · T · E ReAct turn |
| **Process Memory Footprint** | **`61.61 MB RSS`** | Extremely lightweight edge footprint |

```bash
# Run the benchmark yourself:
bun run benchmark
```

---

## <a id="aum-architecture"></a>[3] Architecture: The 5 Layers (AUM)

Every agent implements the **Agent Unified Module (AUM)** across 5 sovereign layers declared as class properties or module keys:

| Layer | Name | Core (Built-in) | Community Extensibility |
|---|---|---|---|
| **L** | **LLM** | Direct provider routing: Sarvam AI Token Factory (2026 models) <sup>IN</sup> & Neon AI Gateway (73+ direct models) | Add Claude, OpenAI, DeepSeek, custom OpenAI-compatible gateways... |
| **I** | **Integration** | Libraries (Zod, Math), in-memory state, persistent memory, Neon Cloud, Git repos | Add LlamaIndex, Redis, custom webhooks, vector stores... |
| **A** | **Agent** | Name, intent, ReAct loop, 1.26M+ `skills.sh` dynamic resolution | Add subagent swarms, custom multi-agent coordinators... |
| **T** | **Tools** | Model Context Protocol (MCP v2 Local Stdio `uvx`/`npx` & Remote HTTP/SSE) | Add filesystem, GitHub, custom MCP servers... |
| **E** | **Environment** | Pure `.env` key reader & execution configuration | Add custom secrets managers, edge isolate configs... |

> **Unifying the Two Greatest Standards:** Liate natively unifies **Vercel Labs' `skills.sh`** (1.26M+ portable domain skills injected into Layer **[A]**) and **Anthropic's Model Context Protocol (MCP)** (modular tools and actuators in Layer **[T]**). Zero custom glue code required.

---

## [4] License

[MIT](LICENSE) © 2026 OpenLiate. Free and open source forever.

<br>

<div align="center">

Built with ❤️ from India to the World

</div>
