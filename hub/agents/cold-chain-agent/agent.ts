import { liate } from "../../../src/liate";

/**
 * ColdChainAgent — Physical-World FDE Incident Controller
 * Connects to local SQLite fleet IoT telemetry via stdio MCP (server.py)
 * and enforces SOP compliance rules (sop.md).
 */
export class ColdChainAgent extends liate {
  public L = "sarvam/sarvam-105b";

  public I = {
    memory: "sessions/cold-chain-fde-v1",
  };

  public A = {
    name: "cold-chain-agent",
    version: "1.0.0",
    intent:
      "Senior Logistics Operations FDE Incident Controller. Enforce cold-chain compliance using query_telemetry_db, fetch_corridor_conditions, and loaded SOP rules.",
    skills: ["./sop.md"],
    maxSteps: 8,
  };

  public T = {
    coldchain: {
      command: "python",
      args: ["./server.py"],
    },
  };

  public E = {
    SARVAM_API_KEY: "$SARVAM_API_KEY",
    MAX_TURNS: "8",
  };
}

export default ColdChainAgent;
