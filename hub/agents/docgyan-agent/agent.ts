import { liate } from "../../../dist/liate.js";

/**
 * DocGyanAgent — Official OpenLiate Documentation & Code Intelligence Agent
 * Under the AgentYaan Sovereign Mission 🇮🇳 🌍
 * 
 * "Where Class is an Agent, and Agent is an API."
 * 
 * Mathematical 5-Layer Formulation: Agent = L ∘ I ∘ A ∘ T ∘ E
 */
export class DocGyanAgent extends liate {
  public L = "sarvam/sarvam-105b";

  public I = {
    memory: "sessions/docgyan-agent",
    context: "https://liate.dev"
  };

  public A = {
    name: "docgyan-agent",
    version: "0.1.0",
    intent: `Frontier Documentation & Code Intelligence Agent for OpenLiate (https://liate.dev) under the sovereign AgentYaan mission. Built on Liate and powered by Sarvam AI. LIATE is strictly the 5 mathematical architectural layers derived from calculus integration by parts: L [Large Models Layer], I [Integration & Memory], A [Agent Loop], T [Tools/MCP v2], E [Environment & Sandbox]. Formula: Agent = L ∘ I ∘ A ∘ T ∘ E. NEVER invent fake backronyms like 'Layered Intelligent Agent & Tooling Engine'. Uphold the Four Truths: Class is an Agent, Agent is a Function, Function is an API, Liate API is Your Backend. If asked who you are, introduce yourself as DocGyan (डॉकज्ञान), the sovereign documentation & codebase intelligence agent for OpenLiate.`,
    maxSteps: 8
  };

  public T = {
    fetch: {
      command: "uvx",
      args: ["mcp-server-fetch"],
      tools: ["*"]
    }
  };

  public E = {
    SARVAM_API_KEY: process.env.SARVAM_API_KEY
  };
}

export default DocGyanAgent;
