/**
 * DocGyanAgent — Official OpenLiate Documentation & Code Intelligence Agent
 * Under the AgentYaan Sovereign Mission 🇮🇳 🌍
 * 
 * "Where Class is an Agent, and Agent is an API."
 * 
 * Mathematical 5-Layer Formulation: Agent = L ∘ I ∘ A ∘ T ∘ E
 */

export interface AgentRunResult {
  text: string;
  thought?: string;
  totalSteps: number;
  durationMs: number;
  finishReason: string;
}

export class DocGyanAgent {
  // L — Large Models Layer
  public L = "sarvam/sarvam-105b";

  // I — Integration & Memory Layer
  public I = {
    memory: "sessions/docgyan-agent",
    context: "https://openliate.tech/docs"
  };

  // A — Agent Harness Layer
  public A = {
    name: "docgyan",
    version: "0.1.0",
    intent: `Frontier Documentation & Code Intelligence Agent for OpenLiate (https://openliate.tech/docs) under the sovereign AgentYaan mission. Built on Liate and powered by Sarvam AI. LIATE is strictly the 5 mathematical architectural layers derived from calculus integration by parts: L [Large Models Layer], I [Integration & Memory], A [Agent Loop], T [Tools/MCP v2], E [Environment & Sandbox]. Formula: Agent = L ∘ I ∘ A ∘ T ∘ E. NEVER invent fake backronyms like 'Layered Intelligent Agent & Tooling Engine'. Uphold the Four Truths: Class is an Agent, Agent is a Function, Function is an API, Liate API is Your Backend. If asked who you are, introduce yourself as DocGyan (डॉकज्ञान), the sovereign documentation & codebase intelligence agent for OpenLiate.`,
    maxSteps: 8
  };

  // T — Tools & MCP Layer
  public T = {
    fetch: {
      command: "uvx",
      args: ["mcp-server-fetch"],
      tools: ["*"]
    }
  };

  // E — Environment & Sandbox Layer
  public E = {
    SARVAM_API_KEY: process.env.SARVAM_API_KEY
  };

  /**
   * Executes the agent on a user input prompt using live Sarvam 105B sovereign inference
   */
  public async run(input: string): Promise<AgentRunResult> {
    const startTime = Date.now();
    const apiKey = this.E.SARVAM_API_KEY || process.env.SARVAM_API_KEY;

    if (!apiKey) {
      throw new Error("Missing SARVAM_API_KEY in environment");
    }

    const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "api-subscription-key": apiKey
      },
      body: JSON.stringify({
        model: "sarvam-105b-conversations",
        messages: [
          { role: "system", content: this.A.intent },
          { role: "user", content: input }
        ],
        temperature: 0.2
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Sarvam 105B API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content || "";
    const thought = choice?.message?.reasoning_content || choice?.message?.reasoning;

    return {
      text: typeof text === "string" ? text : JSON.stringify(text),
      thought: thought ? String(thought) : undefined,
      totalSteps: 1,
      durationMs: Date.now() - startTime,
      finishReason: choice?.finish_reason || "stop"
    };
  }
}

export default DocGyanAgent;

