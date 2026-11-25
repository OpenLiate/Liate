import { describe, expect, test } from "bun:test";
import { AUM, liate, Agent, LiateLlmClient } from "@/liate";

describe("Core: AUM & OM (class extends liate)", () => {
  test("AUM.parse normalizes shorthand L·I·A·T·E", () => {
    const mod = AUM.parse({
      L: "sarvam/sarvam-105b-conversations",
      I: { memory: "ephemeral" },
      A: { name: "SovereignAgent", intent: "Help builders" },
      T: ["time"],
      E: { API_KEY: "$SARVAM_API_KEY" }
    });

    expect(mod.L).toBe("sarvam/sarvam-105b-conversations");
    expect((mod.A as any).name).toBe("SovereignAgent");
    expect((mod.A as any).maxSteps).toBe(10);
    expect(mod.I?.memory).toBe("ephemeral");
  });

  test("AUM.parse normalizes Full Name and lowercase styles", () => {
    const full = AUM.parse({
      LLM: "neon/gpt-4o",
      Integration: { memory: "mem" },
      Agent: "FullNameAgent",
      Tools: [],
      Environment: {}
    });
    expect((full.A as any).name).toBe("FullNameAgent");
    expect(full.L).toBe("neon/gpt-4o");

    const lower = AUM.parse({
      llm: "sarvam/sarvam-m",
      integration: { state: { tier: "pro" } },
      agent: { name: "LowerAgent", maxSteps: 5 },
      tools: [],
      environment: {}
    });
    expect((lower.A as any).name).toBe("LowerAgent");
    expect((lower.A as any).maxSteps).toBe(5);
    expect(lower.I?.state?.tier).toBe("pro");
  });

  test("AUM.parse parses TypeScript OOP class string", () => {
    const source = `
      import { liate } from "@openliate/liate";
      export class DemoAgent extends liate {
        L = "sarvam/sarvam-105b-conversations";
        A = { name: "DemoClassAgent", intent: "OOP test" };
      }
    `;
    const mod = AUM.parse(source);
    expect(mod.L).toBe("sarvam/sarvam-105b-conversations");
    expect((mod.A as any).name).toBe("DemoClassAgent");
  });

  test("AUM.resolveEnvironment expands $VAR references", () => {
    const mod = AUM.parse({
      L: "sarvam/sarvam-105b-conversations",
      A: { name: "EnvAgent" },
      E: { SARVAM_API_KEY: "$TEST_KEY", STATIC: "ok" }
    });
    const resolved = AUM.resolveEnvironment(mod, { TEST_KEY: "sk_test_12345" });
    expect(resolved.E?.SARVAM_API_KEY).toBe("sk_test_12345");
    expect(resolved.E?.STATIC).toBe("ok");
  });

  test("OOP subclassing (class extends liate) exports valid AUM module", () => {
    class CustomAgent extends liate {
      L = "sarvam/sarvam-105b-conversations";
      I = { memory: "ephemeral" };
      A = { name: "CustomOOP", intent: "Verify OOP inheritance" };
    }
    const inst = new CustomAgent();
    const mod = inst.toModule();
    expect((mod.A as any).name).toBe("CustomOOP");
    expect(mod.L).toBe("sarvam/sarvam-105b-conversations");
  });

  test("Layer [I] accepts optional agentId and email identity metadata", () => {
    const mod = AUM.parse({
      L: "sarvam/sarvam-105b-conversations",
      I: {
        memory: ":memory:",
        agentId: "agent_01abc",
        email: "research@openliate.tech"
      },
      A: { name: "IdentityAgent" }
    });
    expect(mod.I?.agentId).toBe("agent_01abc");
    expect(mod.I?.email).toBe("research@openliate.tech");
  });

  test("Strict Layer [L]: never hardcodes silent model defaults", async () => {
    expect(() => new Agent({ name: "NoModelAgent" })).toThrow("never hardcodes silent model defaults");

    const client = new LiateLlmClient();
    await expect(client.chat([{ role: "user", content: "hi" }])).rejects.toThrow(
      "Missing required Layer [L] model definition"
    );

    class MissingL extends liate {
      A = { name: "MissingL" };
    }
    const inst = new MissingL();
    expect(() => inst.toModule()).toThrow("Invalid AUM Module");
  });
});
