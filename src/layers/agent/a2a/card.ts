import type { AgentSpec } from "@/core/spec";

export interface A2ASkill {
  id: string;
  name: string;
  description?: string;
  inputModes?: string[];
  outputModes?: string[];
  tags?: string[];
}

export interface A2AInterface {
  url: string;
  protocolBinding: "JSONRPC" | "HTTP+JSON";
  protocolVersion: string;
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  protocolVersion: string;
  provider?: {
    organization: string;
    url?: string;
  };
  supportedInterfaces: A2AInterface[];
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: A2ASkill[];
  supportsAuthenticatedExtendedCard: boolean;
}

/**
 * Builds an A2A v1.0 (2026) compliant Agent Card (`/.well-known/agent-card.json` & `/.well-known/agent.json`)
 * directly from a Liate L·I·A·T·E AgentSpec.
 */
export function buildAgentCard(spec: AgentSpec, baseUrl = "http://localhost:7071"): AgentCard {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const a2aUrl = `${cleanBase}/a2a`;
  const layerA = typeof spec.A === "string" ? { name: spec.A } : spec.A;
  const skills: A2ASkill[] = [];

  for (const s of layerA.skills || []) {
    skills.push({
      id: s,
      name: s,
      description: `Skill: ${s}`,
      inputModes: ["text/plain"],
      outputModes: ["text/plain", "application/json"],
      tags: ["skill"]
    });
  }

  if (spec.T && typeof spec.T === "object" && !Array.isArray(spec.T)) {
    for (const [key, val] of Object.entries(spec.T)) {
      skills.push({
        id: `tool:${key}`,
        name: key,
        description:
          typeof val === "object" && val && "description" in val
            ? String((val as any).description)
            : `Layer [T] tool: ${key}`,
        inputModes: ["text/plain", "application/json"],
        outputModes: ["text/plain", "application/json"],
        tags: ["tool"]
      });
    }
  } else if (Array.isArray(spec.T)) {
    for (const entry of spec.T) {
      const id = typeof entry === "string" ? entry : entry.name || "tool";
      skills.push({
        id: `tool:${id}`,
        name: id,
        description: typeof entry === "object" && entry.description ? entry.description : `Layer [T] tool: ${id}`,
        inputModes: ["text/plain", "application/json"],
        outputModes: ["text/plain", "application/json"],
        tags: ["tool"]
      });
    }
  }

  return {
    name: layerA.name,
    description: layerA.intent || `${layerA.name} — OpenLiate L·I·A·T·E Agent`,
    url: a2aUrl,
    version: layerA.version || "0.4.0",
    protocolVersion: "1.0",
    provider: {
      organization: "OpenLiate",
      url: "https://openliate.tech"
    },
    supportedInterfaces: [
      {
        url: a2aUrl,
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0"
      }
    ],
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: true
    },
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain", "application/json"],
    skills,
    supportsAuthenticatedExtendedCard: false
  };
}
