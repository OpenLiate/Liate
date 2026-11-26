export type ContextValue = string | Record<string, any>;

/**
 * Layer [I] Context Manager
 * Merges static Layer [I].context with per-run context and formats it for Layer [A].
 */
export class ContextManager {
  /**
   * Merges base Layer [I].context with optional per-run context.
   */
  public static merge(base?: ContextValue, override?: ContextValue): ContextValue | undefined {
    if (base && typeof base === "object" && override && typeof override === "object") {
      return { ...base, ...override };
    }
    return override ?? base;
  }

  /**
   * Formats Layer [I].context into a prompt-ready <context> block.
   */
  public static format(context?: ContextValue): string {
    if (!context) return "";
    if (typeof context === "string") {
      const trimmed = context.trim();
      return trimmed ? `\n\n<context>\n${trimmed}\n</context>` : "";
    }
    if (typeof context === "object" && Object.keys(context).length > 0) {
      return `\n\n<context>\n${JSON.stringify(context, null, 2)}\n</context>`;
    }
    return "";
  }
}
