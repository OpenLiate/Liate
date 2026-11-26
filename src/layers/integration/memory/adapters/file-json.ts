import path from "node:path";
import type { SessionAdapterDefinition } from "@/layers/integration/types";

export const fileJsonSessionAdapter: SessionAdapterDefinition = {
  id: "file-json",
  name: "Local JSON File Session",
  matches: (target?: string) => Boolean(target && target.trim().length > 0),
  create: (target?: string) => {
    const raw = (target || "default").trim();
    let normalized = raw.endsWith(".json") ? raw : `${raw}.json`;

    let filePath: string;
    if (!path.isAbsolute(normalized)) {
      if (normalized.startsWith("sessions/") || normalized.startsWith("sessions\\")) {
        normalized = path.join(".liate", normalized);
      } else if (!normalized.startsWith(".liate")) {
        normalized = path.join(".liate", "sessions", normalized);
      }
      filePath = path.resolve(process.cwd(), normalized);
    } else {
      filePath = normalized;
    }

    return {
      sessionId: path.basename(filePath, ".json"),
      filePath,
      isInMemory: false
    };
  }
};
