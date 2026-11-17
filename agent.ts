import { liate } from "./src/liate";

export class SovereignAgent extends liate {
  L = "sarvam/sarvam-105b";
  I = { memory: "sessions/sovereign-agent" };
  A = { name: "agentyaan", intent: "Autonomous Sovereign Indic Agent", maxSteps: 5 };
  T = {
    fetch: {
      command: "uvx",
      args: ["mcp-server-fetch"],
      tools: ["*"]
    }
  };
  E = { SARVAM_API_KEY: "$SARVAM_API_KEY" };
}

async function main() {
  const agent = new SovereignAgent();
  console.log("=== [agent.ts] Agent Unified Module (AUM) ===");
  console.log(JSON.stringify(agent.toModule(), null, 2));

  console.log("\n=== [agent.ts] Executing via Orchestration Module (OM) ===");
  const result = await agent.run("Fetch https://openliate.tech and summarize.");
  console.log("\nAgent Output:\n" + result.text);
  console.log(`\nModel: ${result.model} | Latency: ${result.durationMs}ms | Steps: ${result.totalSteps}`);
}

if (import.meta.main) {
  main().catch(console.error);
}
