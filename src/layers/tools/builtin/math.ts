import type { AgentTool } from "@/layers/agent/types";

/**
 * Safe recursive-descent arithmetic evaluator (+, -, *, /, %, ^, parentheses).
 * Never uses eval() or new Function().
 */
function evaluateMath(expr: string): number {
  const tokens = expr.replace(/\s+/g, "").match(/(\d+(\.\d+)?|[+\-*/%^()])/g);
  if (!tokens || tokens.join("") !== expr.replace(/\s+/g, "")) {
    throw new Error(`Invalid math expression: '${expr}'`);
  }

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr(): number {
    let left = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = consume();
      const right = parsePower();
      if (op === "*") left *= right;
      else if (op === "/") left /= right;
      else left %= right;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseFactor();
    if (peek() === "^") {
      consume();
      return Math.pow(base, parsePower());
    }
    return base;
  }

  function parseFactor(): number {
    const t = peek();
    if (t === "-") {
      consume();
      return -parseFactor();
    }
    if (t === "+") {
      consume();
      return parseFactor();
    }
    if (t === "(") {
      consume();
      const val = parseExpr();
      if (consume() !== ")") throw new Error("Unmatched parenthesis in math expression");
      return val;
    }
    const num = Number(consume());
    if (Number.isNaN(num)) throw new Error(`Unexpected token in math expression: '${t}'`);
    return num;
  }

  const result = parseExpr();
  if (pos !== tokens.length) {
    throw new Error(`Unexpected trailing token '${tokens[pos]}' in math expression`);
  }
  return result;
}

export const builtinMathTool: AgentTool = {
  name: "math",
  description: "Safely evaluate arithmetic expressions (+, -, *, /, %, ^, parentheses).",
  parameters: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Arithmetic expression, e.g. '(250000 * 0.15) + 4000'"
      }
    },
    required: ["expression"]
  },
  execute: async (args) => {
    const expression = String(args.expression || "");
    const value = evaluateMath(expression);
    return JSON.stringify({ expression, result: value });
  }
};
