import type { AgentTool, IntegrationConnectorDefinition, WebhookIntegrationSpec } from "@/layers/integration/types";

function resolveWebhookUrl(rawUrl: string, env?: Record<string, string | undefined>): string {
  if (!rawUrl.startsWith("$")) return rawUrl;
  const keyName = rawUrl.slice(1);
  return env?.[keyName] ?? (typeof process !== "undefined" ? process.env?.[keyName] : undefined) ?? "";
}

export const webhookConnector: IntegrationConnectorDefinition<WebhookIntegrationSpec> = {
  id: "webhook",
  name: "Outbound Webhook Connector",
  buildTool: (alias, spec, env): AgentTool => {
    const safeName = `webhook_${alias.replace(/[^a-zA-Z0-9_]/g, "_")}`;

    return {
      name: safeName,
      description: spec.description || `Trigger integrated webhook '${alias}'.`,
      parameters: {
        type: "object",
        properties: {
          payload: { type: "object", description: "JSON payload to send to the webhook." }
        },
        required: ["payload"]
      },
      execute: async (args) => {
        const targetUrl = resolveWebhookUrl(spec.url, env);
        if (!targetUrl) {
          throw new Error(`Webhook '${alias}' URL is empty or unresolved (${spec.url}).`);
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(spec.headers || {})
        };

        if (spec.secretEnvVar) {
          const keyName = spec.secretEnvVar.startsWith("$") ? spec.secretEnvVar.slice(1) : spec.secretEnvVar;
          const secret = env?.[keyName] ?? (typeof process !== "undefined" ? process.env?.[keyName] : undefined);
          if (secret) {
            headers["X-Webhook-Secret"] = secret;
          }
        }

        const res = await fetch(targetUrl, {
          method: spec.method || "POST",
          headers,
          body: JSON.stringify(args.payload ?? {})
        });

        const text = await res.text().catch(() => "");
        if (!res.ok) {
          throw new Error(`Webhook '${alias}' failed (${res.status}): ${text}`);
        }
        return { ok: true, status: res.status, response: text };
      }
    };
  }
};
