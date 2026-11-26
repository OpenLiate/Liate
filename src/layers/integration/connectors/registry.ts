import type { AgentTool, IntegrationConfig, IntegrationConnectorDefinition } from "@/layers/integration/types";
import { httpApiConnector } from "@/layers/integration/connectors/http-api";
import { webhookConnector } from "@/layers/integration/connectors/webhook";

/**
 * Built-in Layer [I] External Connectors.
 * Contributors add new API/Webhook/SaaS connectors under connectors/ and register them here.
 */
export const BUILTIN_CONNECTORS: IntegrationConnectorDefinition<any>[] = [
  httpApiConnector,
  webhookConnector
];

export function listConnectors(): IntegrationConnectorDefinition<any>[] {
  return [...BUILTIN_CONNECTORS];
}

export function resolveConnectorTools(
  config?: IntegrationConfig,
  env?: Record<string, string | undefined>
): AgentTool[] {
  if (!config || typeof config !== "object") return [];
  const tools: AgentTool[] = [];

  if (config.apis && typeof config.apis === "object") {
    for (const [alias, spec] of Object.entries(config.apis)) {
      if (spec && typeof spec === "object" && spec.baseUrl) {
        tools.push(httpApiConnector.buildTool(alias, spec, env));
      }
    }
  }

  if (config.webhooks && typeof config.webhooks === "object") {
    for (const [alias, spec] of Object.entries(config.webhooks)) {
      if (spec && typeof spec === "object" && spec.url) {
        tools.push(webhookConnector.buildTool(alias, spec, env));
      }
    }
  }

  return tools;
}
