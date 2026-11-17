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
  <a href="https://pypi.org/project/openliate/"><img src="https://img.shields.io/badge/pypi-v0.1.5-white?labelColor=black&style=flat-square" alt="PyPI: v0.1.5"></a>
  <img src="https://img.shields.io/badge/Python-3.9%20%7C%203.10%20%7C%203.11%20%7C%203.12%20%7C%203.13%20%7C%203.14%20%7C%203.15-white?logo=python&logoColor=white&labelColor=black&style=flat-square" alt="Python 3.9+">
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
pip install liate
# or
pip install openliate
```

---

## Quickstart: The 5-Line OOP AI Agent

Every agent is declared natively as a Python class inheriting from `Liate`. The 5 layers map 1-to-1 to NVIDIA CEO Jensen Huang's 5 foundational agent elements:

```python
from liate import Liate

class SovereignAgent(Liate):
    L = "sarvam/sarvam-105b"                         # [L] Large Models Layer (Sarvam Indic 105B)
    I = {"memory": "sessions/sovereign-agent"}       # [I] Integration & Memory Layer
    A = {                                            # [A] Agent Harness Layer
        "name": "agentyaan",
        "intent": "Autonomous Sovereign Indic Agent",
        "maxSteps": 5
    }
    T = {                                            # [T] Tools & MCP Layer (Stdio & SSE)
        "fetch": {
            "command": "uvx",
            "args": ["mcp-server-fetch"],
            "tools": ["*"]
        }
    }
    E = {"SARVAM_API_KEY": "$SARVAM_API_KEY"}        # [E] Environment & Sandbox Layer

# Run the agent via the autonomous ReAct loop:
agent = SovereignAgent()
result = agent.run("Fetch https://openliate.tech and summarize.")
print(result.response)
```

---

## The 5 Layers (L · I · A · T · E)

| Layer | Component | Description |
| :--- | :--- | :--- |
| **`L`** | **LLM / Large Models** | Native provider routing for Sarvam AI (105B Reasoning, Bulbul TTS, Saaras STT), Neon AI Gateway (63+ models), and OpenAI endpoints. |
| **`I`** | **Integration & Memory** | Co-located session memory, database state persistence, and knowledge context. |
| **`A`** | **Agent Harness** | Autonomous ReAct reasoning loop, intent declaration, and step guardrails. |
| **`T`** | **Tools & Actuators** | Model Context Protocol (Anthropic MCP v2 stdio `uvx`/`npx` & HTTP/SSE transports). |
| **`E`** | **Environment & Sandbox** | Secrets management, API key masking, and security guardrails. |

---

## Links & Ecosystem

* **Website & Documentation:** [https://openliate.tech](https://openliate.tech)
* **GitHub Repository:** [https://github.com/OpenLiate/Liate](https://github.com/OpenLiate/Liate)
* **Developer Community:** [OpenLiate Community](https://github.com/OpenLiate/Liate/discussions)

## License

[MIT License](https://github.com/OpenLiate/Liate/blob/main/LICENSE) © 2026 OpenLiate.
