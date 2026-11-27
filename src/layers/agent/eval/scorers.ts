import type { z } from "zod";
import type { AgentRunResult } from "@/layers/agent/types";

export interface EvalCaseContext {
  input: string;
  expected?: string;
  metadata?: Record<string, any>;
}

export interface EvalScoreResult {
  name: string;
  score: number; // 0..1
  passed: boolean;
  reason?: string;
}

export type EvalScorer = (
  result: AgentRunResult,
  ctx: EvalCaseContext
) => EvalScoreResult | Promise<EvalScoreResult>;

/**
 * Built-in Production Evaluators / Scorers for Liate Agents.
 */
export const Scorers = {
  exactMatch(expected?: string, caseSensitive = false): EvalScorer {
    return (result, ctx) => {
      const target = expected ?? ctx.expected ?? "";
      const a = caseSensitive ? result.text.trim() : result.text.trim().toLowerCase();
      const b = caseSensitive ? target.trim() : target.trim().toLowerCase();
      const passed = a === b;
      return {
        name: "exactMatch",
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `Expected "${target}", got "${result.text.trim()}"`
      };
    };
  },

  contains(substring?: string, caseSensitive = false): EvalScorer {
    return (result, ctx) => {
      const target = substring ?? ctx.expected ?? "";
      const hay = caseSensitive ? result.text : result.text.toLowerCase();
      const needle = caseSensitive ? target : target.toLowerCase();
      const passed = needle.length > 0 && hay.includes(needle);
      return {
        name: "contains",
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `Output did not contain "${target}"`
      };
    };
  },

  regex(pattern: RegExp, name = "regex"): EvalScorer {
    return (result) => {
      const passed = pattern.test(result.text);
      return {
        name,
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `Output did not match ${pattern.toString()}`
      };
    };
  },

  jsonValid(): EvalScorer {
    return (result) => {
      const cleaned = result.text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      try {
        JSON.parse(cleaned);
        return { name: "jsonValid", score: 1, passed: true };
      } catch (err: any) {
        return {
          name: "jsonValid",
          score: 0,
          passed: false,
          reason: `Invalid JSON: ${err.message}`
        };
      }
    };
  },

  jsonSchema<T>(schema: z.ZodType<T>, name = "jsonSchema"): EvalScorer {
    return (result) => {
      const cleaned = result.text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      try {
        const parsed = JSON.parse(cleaned);
        const check = schema.safeParse(parsed);
        if (check.success) {
          return { name, score: 1, passed: true };
        }
        return {
          name,
          score: 0,
          passed: false,
          reason: check.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        };
      } catch (err: any) {
        return {
          name,
          score: 0,
          passed: false,
          reason: `Invalid JSON: ${err.message}`
        };
      }
    };
  },

  toolCallMatch(expectedTools: string[], ordered = false): EvalScorer {
    return (result) => {
      const actualTools: string[] = [];
      for (const step of result.steps || []) {
        for (const tc of step.toolCalls || []) {
          actualTools.push(tc.name);
        }
      }

      if (ordered) {
        let idx = 0;
        for (const t of actualTools) {
          if (t === expectedTools[idx]) idx++;
          if (idx === expectedTools.length) break;
        }
        const passed = idx === expectedTools.length;
        return {
          name: "toolCallMatch",
          score: expectedTools.length === 0 ? 1 : Number((idx / expectedTools.length).toFixed(3)),
          passed,
          reason: passed
            ? undefined
            : `Expected ordered tools [${expectedTools.join(", ")}], got [${actualTools.join(", ")}]`
        };
      }

      const actualSet = new Set(actualTools);
      const matched = expectedTools.filter((t) => actualSet.has(t)).length;
      const passed = matched === expectedTools.length;
      return {
        name: "toolCallMatch",
        score: expectedTools.length === 0 ? 1 : Number((matched / expectedTools.length).toFixed(3)),
        passed,
        reason: passed
          ? undefined
          : `Missing tools [${expectedTools.filter((t) => !actualSet.has(t)).join(", ")}]`
      };
    };
  },

  latencyBudget(maxMs: number): EvalScorer {
    return (result) => {
      const passed = result.durationMs <= maxMs;
      return {
        name: "latencyBudget",
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `Duration ${result.durationMs}ms exceeded ${maxMs}ms budget`
      };
    };
  },

  maxStepsBudget(maxSteps: number): EvalScorer {
    return (result) => {
      const passed = result.totalSteps <= maxSteps;
      return {
        name: "maxStepsBudget",
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `Steps ${result.totalSteps} exceeded ${maxSteps}`
      };
    };
  },

  custom(
    name: string,
    fn: (result: AgentRunResult, ctx: EvalCaseContext) => boolean | number | EvalScoreResult | Promise<boolean | number | EvalScoreResult>
  ): EvalScorer {
    return async (result, ctx) => {
      const raw = await fn(result, ctx);
      if (typeof raw === "boolean") {
        return { name, score: raw ? 1 : 0, passed: raw };
      }
      if (typeof raw === "number") {
        const clamped = Math.max(0, Math.min(1, raw));
        return { name, score: clamped, passed: clamped >= 0.5 };
      }
      return raw;
    };
  }
};
