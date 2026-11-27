import { z } from "zod";
import type { LlmMessage } from "@/layers/llm/model";

export type OutputSchemaInput = z.ZodType<any> | Record<string, any>;

function isZodSchema(schema: any): schema is z.ZodType<any> {
  return Boolean(schema && typeof schema === "object" && typeof schema.safeParse === "function");
}

function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Layer [A] Typed Structured Output Resolver
 * Enforces Zod or JSON Schema output contracts with automatic JSON extraction
 * and 1-step LLM self-repair on parse or validation failure.
 */
export class StructuredOutputResolver {
  public static buildInstruction(schema: OutputSchemaInput): string {
    let schemaDesc = "Valid JSON matching the required schema.";
    if (isZodSchema(schema)) {
      try {
        const jsonSchema = (z as any).toJSONSchema ? (z as any).toJSONSchema(schema) : undefined;
        if (jsonSchema) {
          schemaDesc = JSON.stringify(jsonSchema);
        }
      } catch {
        schemaDesc = "Valid JSON matching the Zod schema.";
      }
    } else if (schema && typeof schema === "object") {
      schemaDesc = JSON.stringify(schema);
    }

    return `\n\n[STRUCTURED OUTPUT CONTRACT]: You MUST respond ONLY with raw valid JSON matching this schema (no markdown fences, no commentary):\n${schemaDesc}`;
  }

  public static validate<T = any>(
    rawText: string,
    schema: OutputSchemaInput
  ): { success: true; data: T; normalizedText: string } | { success: false; error: string } {
    const cleaned = stripJsonFences(rawText);
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err: any) {
      return { success: false, error: `Invalid JSON: ${err.message}` };
    }

    if (isZodSchema(schema)) {
      const check = schema.safeParse(parsed);
      if (!check.success) {
        const msg = check.error.issues
          .map((i: any) => `${(i.path || []).join(".") || "<root>"}: ${i.message}`)
          .join("; ");
        return { success: false, error: `Schema validation failed: ${msg}` };
      }
      return {
        success: true,
        data: check.data as T,
        normalizedText: JSON.stringify(check.data)
      };
    }

    // Basic JSON Schema required/type checks when a raw JSON Schema object is supplied
    if (schema && typeof schema === "object") {
      if (schema.type === "object" && (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))) {
        return { success: false, error: "Expected JSON object" };
      }
      if (schema.type === "array" && !Array.isArray(parsed)) {
        return { success: false, error: "Expected JSON array" };
      }
      if (Array.isArray(schema.required) && parsed && typeof parsed === "object") {
        const missing = schema.required.filter((k: string) => !(k in parsed));
        if (missing.length > 0) {
          return { success: false, error: `Missing required keys: ${missing.join(", ")}` };
        }
      }
    }

    return {
      success: true,
      data: parsed as T,
      normalizedText: JSON.stringify(parsed)
    };
  }

  public static buildRepairMessage(rawText: string, error: string): LlmMessage {
    return {
      role: "user",
      content: `Your previous response failed structured output validation (${error}). Previous output:\n${rawText}\n\nReturn ONLY corrected raw valid JSON matching the schema.`
    };
  }
}
