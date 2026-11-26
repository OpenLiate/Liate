import type { SessionAdapterDefinition } from "@/layers/integration/types";
import { inMemorySessionAdapter } from "@/layers/integration/memory/adapters/in-memory";
import { sqliteSessionAdapter } from "@/layers/integration/memory/adapters/sqlite";
import { postgresSessionAdapter } from "@/layers/integration/memory/adapters/postgres";
import { fileJsonSessionAdapter } from "@/layers/integration/memory/adapters/file-json";

/**
 * Built-in Layer [I] Session Memory Adapters.
 * To add a new storage backend in a PR (e.g. Redis, DynamoDB):
 * create 1 file under memory/adapters/ and add it before fileJsonSessionAdapter.
 */
export const BUILTIN_SESSION_ADAPTERS: SessionAdapterDefinition[] = [
  inMemorySessionAdapter,
  sqliteSessionAdapter,
  postgresSessionAdapter,
  fileJsonSessionAdapter
];

export function resolveSessionAdapter(target?: string): SessionAdapterDefinition {
  for (const adapter of BUILTIN_SESSION_ADAPTERS) {
    if (adapter.matches(target)) {
      return adapter;
    }
  }
  return fileJsonSessionAdapter;
}

export function listSessionAdapters(): SessionAdapterDefinition[] {
  return [...BUILTIN_SESSION_ADAPTERS];
}
