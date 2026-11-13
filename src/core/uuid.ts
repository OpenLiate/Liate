// src/core/uuid.ts
import { randomUUID } from "node:crypto";

export function generateId(prefix?: string): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

