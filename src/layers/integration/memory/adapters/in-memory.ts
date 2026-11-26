import type { SessionAdapterDefinition } from "@/layers/integration/types";

export const inMemorySessionAdapter: SessionAdapterDefinition = {
  id: "in-memory",
  name: "In-Memory Ephemeral Session",
  matches: (target?: string) =>
    !target || target === ":memory:" || target === "memory" || target === "in-memory",
  create: (target?: string) => {
    const sessionId =
      target && target !== ":memory:" && target !== "memory" && target !== "in-memory"
        ? target
        : "ephemeral";
    return {
      sessionId,
      isInMemory: true
    };
  }
};
