/**
 * Sprint 6 Tests — Multi-Model Layer [L] (MultiModelMap)
 *
 * Tests:
 *   1.  MultiModelMap: isMultiModelMap detects map vs string vs single-model object
 *   2.  MultiModelMap: resolveModelTag picks by exact tag name
 *   3.  MultiModelMap: resolveModelTag falls back to "default"
 *   4.  MultiModelMap: resolveModelTag falls back to first entry when no "default"
 *   5.  MultiModelMap: resolveModelTag throws when map is empty
 *   6.  AUM.parse accepts MultiModelMap in Layer [L]
 *   7.  AUM.parse accepts object entries inside MultiModelMap
 *   8.  Agent.getModelTags: returns tag names for multi-model L
 *   9.  Agent.getModelTags: returns [] for single-model L
 *   10. Agent.run: resolves modelTag via ReActLoop + mock LLM
 *   11. Agent.run: falls back to "default" tag when modelTag is omitted
 *   12. OOP: MultiModelMap L via class extends liate
 *   13. Hub agent: multi-model-agent/agent.json parses correctly
 *   14. Regression: single-model L (string) still works unchanged
 *   15. Regression: OOP + MultiModelMap toModule() roundtrips cleanly
 */

import { describe, expect, test } from "bun:test";
import {
  isMultiModelMap,
  resolveModelTag,
  AUM,
  liate,
  Agent,
  Session,
  ReActLoop,
  type AgentContext
} from "@/liate";

describe("Sprint 6: MultiModelMap spec utilities", () => {
  test("1. isMultiModelMap: detects map vs string vs single-model object", () => {
    expect(isMultiModelMap("sarvam/sarvam-m")).toBe(false);
    expect(isMultiModelMap({ model: "sarvam-m", provider: "sarvam" })).toBe(false);
    expect(isMultiModelMap({ default: "sarvam/sarvam-m", fast: "ollama/gemma4:e2b" })).toBe(true);
    expect(isMultiModelMap({ reason: "openrouter/nvidia/nemotron-3.5-lightning:free" })).toBe(true);
  });

  test("2. resolveModelTag: picks model by exact tag name", () => {
    const map = {
      default: "sarvam/sarvam-m",
      fast: "ollama/gemma4:e2b",
      reason: "openrouter/nvidia/nemotron-3.5-lightning:free"
    };
    expect(resolveModelTag(map, "fast")).toBe("ollama/gemma4:e2b");
    expect(resolveModelTag(map, "reason")).toBe("openrouter/nvidia/nemotron-3.5-lightning:free");
    expect(resolveModelTag(map, "default")).toBe("sarvam/sarvam-m");
  });

  test("3. resolveModelTag: falls back to 'default' key when tag missing", () => {
    const map = { default: "sarvam/sarvam-m", fast: "ollama/gemma4:e2b" };
    expect(resolveModelTag(map, "nonexistent")).toBe("sarvam/sarvam-m");
    expect(resolveModelTag(map)).toBe("sarvam/sarvam-m");
  });

  test("4. resolveModelTag: falls back to first entry when no 'default' key", () => {
    const map = { fast: "ollama/gemma4:e2b", reason: "openrouter/nvidia/nemotron-3.5-lightning:free" };
    expect(resolveModelTag(map)).toBe("ollama/gemma4:e2b");
  });

  test("5. resolveModelTag: throws when MultiModelMap is empty", () => {
    expect(() => resolveModelTag({} as any, "fast")).toThrow("MultiModelMap has no model entries");
  });
});

describe("Sprint 6: AUM schema — MultiModelMap in Layer [L]", () => {
  test("6. AUM.parse: accepts MultiModelMap as Layer [L]", () => {
    const mod = AUM.parse({
      L: {
        default: "sarvam/sarvam-m",
        fast: "ollama/gemma4:e2b",
        reason: "openrouter/nvidia/nemotron-3.5-lightning:free"
      },
      A: { name: "MultiModelAgent" }
    });
    expect(isMultiModelMap(mod.L as any)).toBe(true);
    expect((mod.L as any).fast).toBe("ollama/gemma4:e2b");
    expect((mod.A as any).name).toBe("MultiModelAgent");
  });

  test("7. AUM.parse: accepts object entries inside MultiModelMap", () => {
    const mod = AUM.parse({
      L: {
        default: { provider: "sarvam", model: "sarvam-m" },
        fast: { provider: "ollama", model: "gemma4:e2b" }
      },
      A: { name: "ObjectMapAgent" }
    });
    expect(isMultiModelMap(mod.L as any)).toBe(true);
    expect((mod.L as any).fast.provider).toBe("ollama");
    expect((mod.L as any).fast.model).toBe("gemma4:e2b");
  });
});

describe("Sprint 6: Agent harness — multi-model tags", () => {
  const multiModelL = {
    default: "sarvam/sarvam-m",
    fast: "ollama/gemma4:e2b",
    reason: "openrouter/nvidia/nemotron-3.5-lightning:free"
  };

  test("8. Agent.getModelTags: returns tag names for multi-model L", () => {
    const agent = new Agent({ name: "TagAgent", layerL: multiModelL });
    const tags = agent.getModelTags();
    expect(tags).toContain("default");
    expect(tags).toContain("fast");
    expect(tags).toContain("reason");
    expect(tags).toHaveLength(3);
  });

  test("9. Agent.getModelTags: returns [] for single-model L", () => {
    const agent = new Agent({ name: "SingleAgent", model: "sarvam/sarvam-m" });
    expect(agent.getModelTags()).toEqual([]);
  });

  test("10. Agent.run: resolves modelTag via ReActLoop", async () => {
    const usedModels: string[] = [];
    const origExecute = ReActLoop.execute;
    (ReActLoop as any).execute = async (_p: any, _llm: any, _mem: any, _tools: any, _ctx: any, opts: any) => {
      usedModels.push(opts.model);
      return { text: "ok", steps: [], totalSteps: 1, model: opts.model, durationMs: 0, finishReason: "stop" };
    };

    try {
      const agent = new Agent({ name: "TagRunner", layerL: multiModelL });
      await agent.run("quick ping", { modelTag: "fast" });
      await agent.run("deep think", { modelTag: "reason" });
      expect(usedModels).toEqual([
        "ollama/gemma4:e2b",
        "openrouter/nvidia/nemotron-3.5-lightning:free"
      ]);
    } finally {
      (ReActLoop as any).execute = origExecute;
    }
  });

  test("11. Agent.run: falls back to 'default' tag when modelTag is omitted", async () => {
    const usedModels: string[] = [];
    const origExecute = ReActLoop.execute;
    (ReActLoop as any).execute = async (_p: any, _llm: any, _mem: any, _tools: any, _ctx: any, opts: any) => {
      usedModels.push(opts.model);
      return { text: "ok", steps: [], totalSteps: 1, model: opts.model, durationMs: 0, finishReason: "stop" };
    };

    try {
      const agent = new Agent({ name: "DefaultRunner", layerL: multiModelL });
      await agent.run("normal prompt");
      expect(usedModels).toEqual(["sarvam/sarvam-m"]);
    } finally {
      (ReActLoop as any).execute = origExecute;
    }
  });
});

describe("Sprint 6: liate OOP class & Hub agents", () => {
  test("12. OOP: MultiModelMap L via class extends liate", () => {
    class MultiModelAgent extends liate {
      L = {
        default: "sarvam/sarvam-m",
        fast: "ollama/gemma4:e2b",
        reason: "openrouter/nvidia/nemotron-3.5-lightning:free"
      };
      A = { name: "MultiModelOOP", intent: "Test multi-model OOP" };
    }

    const inst = new MultiModelAgent();
    const mod = inst.toModule();

    expect(isMultiModelMap(mod.L as any)).toBe(true);
    expect((mod.L as any).fast).toBe("ollama/gemma4:e2b");
    expect((mod.A as any).name).toBe("MultiModelOOP");
  });

  test("13. hub/agents/multi-model-agent/agent.json parses correctly", async () => {
    const agent = await liate.load("hub/agents/multi-model-agent");
    const mod = agent.toModule();

    expect(isMultiModelMap(mod.L as any)).toBe(true);
    expect((mod.L as any).default).toBe("sarvam/sarvam-105b");
    expect((mod.L as any).fast).toBe("ollama/gemma4:e2b");
    expect((mod.A as any).name).toBe("multi-model-agent");
  });

  test("14. Regression: single-model L (string) still parses & runs without change", () => {
    const mod = AUM.parse({
      L: "sarvam/sarvam-105b-conversations",
      A: { name: "SingleRegression" }
    });
    expect(typeof mod.L).toBe("string");
    expect(isMultiModelMap(mod.L as any)).toBe(false);
    expect((mod.A as any).name).toBe("SingleRegression");
  });

  test("15. Regression: OOP + MultiModelMap toModule() roundtrips full LIATE spec", () => {
    class FullSpec extends liate {
      L = { default: "sarvam/sarvam-105b", fast: "ollama/gemma4:e2b" };
      I = { memory: ":memory:", agentId: "agent_sprint6" };
      A = { name: "FullSpecAgent", intent: "Full roundtrip test", maxSteps: 7 };
      T = [];
      E = { SARVAM_API_KEY: "$SARVAM_API_KEY" };
    }

    const inst = new FullSpec();
    const mod = inst.toModule();

    expect(isMultiModelMap(mod.L as any)).toBe(true);
    expect((mod.L as any).default).toBe("sarvam/sarvam-105b");
    expect(mod.I?.agentId).toBe("agent_sprint6");
    expect((mod.A as any).name).toBe("FullSpecAgent");
    expect((mod.A as any).maxSteps).toBe(7);
    expect(mod.E?.SARVAM_API_KEY).toBe("$SARVAM_API_KEY");
  });
});
