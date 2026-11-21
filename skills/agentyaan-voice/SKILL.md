---
name: agentyaan-voice
description: Official OpenLiate Sovereign Mission Voice Agent powered by Sarvam AI Indus hosted Voice Agents MCP.
version: 1.0.0
---

# AgentYaan Voice Agent (Sarvam AI Indus Voice Agents MCP)

## Overview
**AgentYaan (एजेंटयान)** is the sovereign flagship mission voice agent for the OpenLiate Foundation and Liate OOP Agent Framework. Created directly within **Indus by Sarvam AI** (`indus.sarvam.ai/samvaad/build/my-agents`), it acts as the direct founder voice agent, answering questions live in real-time voice for developers, VCs, and YC partners.

## Core Principle: Where Classes Are AI Agents
Liate does not require hardcoding fragmented speech-to-text, reasoning, and text-to-speech pipelines. Instead, Sarvam AI Indus manages the complete voice agent lifecycle natively, and Liate binds directly to it via the standard Model Context Protocol (MCP).

### MCP Configuration
Add the Sarvam Voice Agents MCP server to any MCP client (Cursor, Claude, Windsurf, Sarvam Code, or Liate runtime):
```json
{
  "mcpServers": {
    "sarvam-voice-agents": {
      "url": "https://mcp.sarvam.ai/voice-agents"
    }
  }
}
```

## Liate OOP Class Implementation

### TypeScript / Bun
```typescript
import { Agent } from "@openliate/liate";

export class AgentYaan extends Agent {
  // Layer T — Tools & MCP: Direct connection to Sarvam Voice Agents MCP
  static mcpServers = {
    "sarvam-voice-agents": {
      url: "https://mcp.sarvam.ai/voice-agents"
    }
  };
}
```

### Python
```python
from liate import Agent

class AgentYaan(Agent):
    """Frontier Voice Agent connected natively to Sarvam Indus via MCP."""
    mcp_servers = {
        "sarvam-voice-agents": {
            "url": "https://mcp.sarvam.ai/voice-agents"
        }
    }
```

## 5-Layer Formulation
```
AgentYaan = L ∘ I ∘ A ∘ T ∘ E
```
- **`[1] L` Large Models:** Sarvam Indus Hosted Voice Agent Runtime (Sarvam 105B Indic LLM + Voice Latency Optimization).
- **`[2] I` Integration:** OpenLiate Foundation benchmarks, hardware telemetry, and co-located session memory.
- **`[3] A` Agent Harness:** Mission Control persona, founder-led authoritative tone, and real-time turn-taking.
- **`[4] T` Tools:** Sarvam Voice Agents Hosted Remote MCP (`https://mcp.sarvam.ai/voice-agents`).
- **`[5] E` Environment:** Sarvam AI Indus Platform (`indus.sarvam.ai/samvaad`) with OAuth 2.0 PKCE / API Key auth.
