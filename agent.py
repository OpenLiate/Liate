import sys
import os
import json

# Auto-load local .env if present
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# Add sdk/python/src to sys.path so it works directly from repo root
sys.path.insert(0, os.path.abspath("sdk/python/src"))

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

    # [I] Integration: Co-located Persistent Memory & Knowledge Context
    I = {"memory": "sessions/agentyaan"}

    # [A] Agent Harness: Autonomous ReAct Loop Layer (OOP Encapsulated)
    A = {
        "name": "agentyaan",
        "intent": "Frontier Sovereign AI Agent · Built on Liate · Selected for India's Sarvam AI Startup Program 2026",
        "maxSteps": 5
    }

    # [T] Tools: Model Context Protocol (Anthropic MCP v2 stdio uvx/npx & HTTP SSE)
    T = {
        "sarvam_ai": {
            "command": "uvx",
            "args": ["sarvam-mcp"],
            "tools": ["*"]
        }
    }

    # [E] Environment: Enterprise Sandbox Guardrails & Secret Masking
    E = {
        "SARVAM_API_KEY": os.environ.get("SARVAM_API_KEY", "$SARVAM_API_KEY"),
        "GNANI_API_KEY": os.environ.get("GNANI_API_KEY", "$GNANI_API_KEY"),
        "NEON_API_KEY": os.environ.get("NEON_API_KEY", "$NEON_API_KEY")
    }

def main():
    agent = FrontierAgent()
    print("=== [agent.py] Agent Unified Module (AUM) ===")
    print(json.dumps(agent.to_module(), indent=2))

    print("\n=== [agent.py] Executing Frontier Agent 'agentyaan' via OM Runtime ===")
    try:
        result = agent.run("Introduce Mission AgentYaan and explain why sovereign OOP AI agents matter for India.")
        print("\nAgent Output:\n" + result.response)
    except ConnectionError as e:
        print("\nNote: Liate API daemon connection notice:")
        print(str(e))
    except Exception as e:
        print("\nExecution result / note:", str(e))

if __name__ == "__main__":
    main()
