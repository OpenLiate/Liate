import type { AgentVersionChange, AgentVersionDiff, AgentVersionSnapshot } from "@/layers/agent/types";

function stableStringify(val: any): string {
  if (val === null || val === undefined) return String(val);
  if (typeof val !== "object") return JSON.stringify(val);
  if (Array.isArray(val)) return `[${val.map(stableStringify).join(",")}]`;
  const keys = Object.keys(val).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(val[k])}`).join(",")}}`;
}

function diffLayerFields(
  layer: "L" | "I" | "A" | "T",
  beforeObj: any,
  afterObj: any
): AgentVersionChange[] {
  const changes: AgentVersionChange[] = [];

  if (
    beforeObj === null ||
    afterObj === null ||
    typeof beforeObj !== "object" ||
    typeof afterObj !== "object" ||
    Array.isArray(beforeObj) ||
    Array.isArray(afterObj)
  ) {
    if (stableStringify(beforeObj) !== stableStringify(afterObj)) {
      changes.push({ layer, field: "*", before: beforeObj, after: afterObj });
    }
    return changes;
  }

  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  for (const key of Array.from(allKeys).sort()) {
    const bVal = beforeObj[key];
    const aVal = afterObj[key];
    if (stableStringify(bVal) !== stableStringify(aVal)) {
      changes.push({ layer, field: key, before: bVal, after: aVal });
    }
  }
  return changes;
}

/**
 * Computes a structural diff between two AgentVersionSnapshots across L · I · A · T.
 */
export function diffAgentSnapshots(
  fromSnap: AgentVersionSnapshot,
  toSnap: AgentVersionSnapshot
): AgentVersionDiff {
  const changes: AgentVersionChange[] = [
    ...diffLayerFields("L", fromSnap.spec.L, toSnap.spec.L),
    ...diffLayerFields("I", fromSnap.spec.I, toSnap.spec.I),
    ...diffLayerFields("A", fromSnap.spec.A, toSnap.spec.A),
    ...diffLayerFields("T", fromSnap.spec.T, toSnap.spec.T)
  ];

  return {
    fromVersion: fromSnap.version,
    toVersion: toSnap.version,
    fromHash: fromSnap.hash,
    toHash: toSnap.hash,
    changed: changes.length > 0,
    changes
  };
}
