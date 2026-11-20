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
  <a href="https://pypi.org/project/openliate/"><img src="https://img.shields.io/badge/pypi-v0.1.6-white?logo=pypi&logoColor=FFD43B&labelColor=black&style=flat-square" alt="PyPI: v0.1.6"></a>
  <img src="https://img.shields.io/badge/Total_Downloads-1%2C495%2B-brightgreen?labelColor=black&style=flat-square" alt="Total Downloads">
  <img src="https://img.shields.io/badge/Python-3.9%20%7C%203.10%20%7C%203.11%20%7C%203.12%20%7C%203.13%20%7C%203.14%20%7C%203.15-white?logo=python&logoColor=white&labelColor=black&style=flat-square" alt="Python 3.9+">
</p>

<p align="center">
  <a href="https://pypi.org/project/liate/"><img src="https://img.shields.io/pypi/v/liate?logo=pypi&logoColor=FFD43B&label=liate&labelColor=black&color=white&style=flat-square" alt="PyPI liate"></a>
  &nbsp;
  <a href="https://pypi.org/project/openliate/"><img src="https://img.shields.io/pypi/v/openliate?logo=pypi&logoColor=FFD43B&label=openliate&labelColor=black&color=white&style=flat-square" alt="PyPI openliate"></a>
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

### #1 Direct Package
```bash
pip install liate
```

### #2 Alternative Package
```bash
pip install openliate
```

---

## [1] Quickstart: Frontier Sovereign Agent (`FrontierAgent` / `agentyaan`)

Every agent is declared natively as a Python class inheriting from `Liate`. The 5 layers map 1-to-1 to NVIDIA CEO Jensen Huang's 5 foundational agent elements:

```python
from liate import Liate

class FrontierAgent(Liate):
    # [L] Large Models: Native Routing across Sovereign & 65+ Frontier AI Models:
    # - "sarvam/sarvam-105b" (Sarvam AI Indic Foundation Model - Startup Program 2026)
    # - "sarvam/sarvam-prism" (Sarvam AI Nov 2026 Frontier Decision & System-1 LoRA Model ~44ms)
    # - "sarvam/sarvam-30b" | "sarvam/bulbul-v4" | "sarvam/saaras-v4"
    # - "gnani/prisma-v3" (Gnani AI STT 10+ Indic Languages) | "gnani/timbre-v3" (Gnani AI TTS Multilingual)
    # - "neon/gemini-2.5-pro" | "neon/gemini-2.5-flash" (Google Gemini Frontier Series)
    # - "neon/claude-3-7-sonnet" | "neon/claude-3-5-haiku" (Anthropic Frontier Series)
    # - 65+ Frontier AI Models via Neon AI Gateway with JEV System-One Heuristic Routing
    L = "sarvam/sarvam-105b"

    # [I] Integration & Memory Layer
    I = {"memory": "sessions/agentyaan"}

    # [A] Agent Harness Layer
    A = {
        "name": "agentyaan",
        "intent": "Frontier Sovereign AI Agent · Built on Liate · Selected for India's Sarvam AI Startup Program 2026",
        "maxSteps": 5
    }

    # [T] Tools & MCP Layer (Stdio uvx/npx & Remote SSE)
    T = {
        "sarvam_ai": {
            "command": "uvx",
            "args": ["sarvam-mcp"],
            "tools": ["*"]
        }
    }

    # [E] Environment & Sandbox Layer
    E = {
        "SARVAM_API_KEY": "$SARVAM_API_KEY",
        "GNANI_API_KEY": "$GNANI_API_KEY",
        "NEON_API_KEY": "$NEON_API_KEY"
    }

# Run the agent via the autonomous ReAct loop:
agent = FrontierAgent()
result = agent.run("Introduce Mission AgentYaan and explain why sovereign OOP AI agents matter for India.")
print(result.response)
```

---

## [2] The 5 Layers (L · I · A · T · E)

| Layer | Component | Description |
| :--- | :--- | :--- |
| **`L`** | **LLM / Large Models** | Native provider routing for Sarvam AI (105B Reasoning, Bulbul TTS, Saaras STT), Neon AI Gateway (63+ models), and OpenAI endpoints. |
| **`I`** | **Integration & Memory** | Co-located session memory, database state persistence, and knowledge context. |
| **`A`** | **Agent Harness** | Autonomous ReAct reasoning loop, intent declaration, and step guardrails. |
| **`T`** | **Tools & Actuators** | Model Context Protocol (Anthropic MCP v2 stdio `uvx`/`npx` & HTTP/SSE transports). |
| **`E`** | **Environment & Sandbox** | Secrets management, API key masking, and security guardrails. |

---

## [3] Real Production Ecosystem Traction

| Registry | Package Distribution | Total Downloads | Telemetry Source |
| :--- | :--- | :--- | :--- |
| **PyPI** | [`openliate`](https://pypi.org/project/openliate/) | **458+** | [pypistats.org/packages/openliate](https://pypistats.org/packages/openliate) |
| **PyPI** | [`liate`](https://pypi.org/project/liate/) | **236+** | [pypistats.org/packages/liate](https://pypistats.org/packages/liate) |
| **npm** | [`openliate`](https://www.npmjs.com/package/openliate) | **531+** | Direct Developer CLI & Runners |
| **npm** | [`@openliate/liate`](https://www.npmjs.com/package/@openliate/liate) | **270+** | TypeScript SDK Imports |
| **Total** | **Combined Ecosystem** | **1,495+ Total Installs** | **Over 800+ Direct Human Installs (`without_mirrors`)** |

---

## [4] Links & Ecosystem

* **Website & Documentation:** [https://openliate.tech](https://openliate.tech)
* **GitHub Repository:** [https://github.com/OpenLiate/Liate](https://github.com/OpenLiate/Liate)
* **Developer Community:** [OpenLiate Community](https://github.com/OpenLiate/Liate/discussions)

---

## [5] License

[MIT License](https://github.com/OpenLiate/Liate/blob/main/LICENSE) © 2026 OpenLiate.
