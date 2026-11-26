import type { ApiToolSpec } from "@/layers/tools/types";

/**
 * Built-in Layer [T] API Tool Presets.
 * Contributors add new API tool specs under src/layers/tools/api/ and register them here.
 */
export const API_TOOL_PRESETS: Record<string, ApiToolSpec> = {};

export function listApiToolPresets(): string[] {
  return Object.keys(API_TOOL_PRESETS);
}

export function resolveApiToolPreset(name: string): ApiToolSpec | undefined {
  const clean = name.replace(/^api:/i, "").trim().toLowerCase();
  return API_TOOL_PRESETS[clean];
}
