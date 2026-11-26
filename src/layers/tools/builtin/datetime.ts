import type { AgentTool } from "@/layers/agent/types";

export const builtinDatetimeTool: AgentTool = {
  name: "datetime",
  description: "Get the current date, time, ISO timestamp, and timezone.",
  parameters: {
    type: "object",
    properties: {
      timeZone: {
        type: "string",
        description: "Optional IANA timezone (e.g. 'Asia/Kolkata', 'UTC', 'America/New_York')"
      }
    }
  },
  execute: async (args) => {
    const now = new Date();
    const tz = args.timeZone ? String(args.timeZone) : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      dateStyle: "full",
      timeStyle: "long"
    }).format(now);
    return JSON.stringify({
      iso: now.toISOString(),
      timeZone: tz,
      formatted
    });
  }
};
