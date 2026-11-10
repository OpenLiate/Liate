#!/usr/bin/env node
// src/cli/index.ts
// Liate v0.0.8 — Unified Developer CLI Engine
// Commands: run, chat, serve

import { resolveAgent } from "@/cli/resolver";
import { EnvironmentResolver } from "@/layers/environment/sandbox";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync } from "node:fs";

const VERSION = "0.0.8";

function printHelp(): void {
  console.log(`
Liate — India's Open Source AI Agent Framework (v${VERSION})

Usage:
  liate <command> [options]

Commands:
  run [file] <prompt>    Execute an agent with a single prompt
  chat [file]            Start an interactive multi-turn REPL chat session
  serve [file] [--port]  Start the Hono edge runtime server (default: 7071)

Options:
  -v, --version          Show Liate version
  -h, --help             Show help documentation

Examples:
  liate run "What is the capital of India?"
  liate run agent.ts "Evaluate mandate policy"
  liate run agent.json "Check current time"
  liate chat
  liate chat agent.ts
  liate serve --port 7071
`);
}

async function main(): Promise<void> {
  // Ensure local .env is loaded
  EnvironmentResolver.loadEnv();

  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "-h" || command === "--help" || command === "help") {
    printHelp();
    process.exit(0);
  }

  if (command === "-v" || command === "--version" || command === "version") {
    console.log(`Liate v${VERSION}`);
    process.exit(0);
  }

  // 1. Command: run
  if (command === "run") {
    const remaining = args.slice(1);
    if (remaining.length === 0) {
      console.error("Error: Missing prompt for 'liate run'.");
      console.log("Usage: liate run [file] <prompt>");
      process.exit(1);
    }

    let fileCandidate: string | undefined = undefined;
    let promptParts: string[] = remaining;

    // Check if first argument is a file
    if (
      remaining[0].endsWith(".ts") ||
      remaining[0].endsWith(".json") ||
      remaining[0].endsWith(".js") ||
      existsSync(remaining[0])
    ) {
      fileCandidate = remaining[0];
      promptParts = remaining.slice(1);
    }

    const prompt = promptParts.join(" ").trim();
    if (!prompt) {
      console.error("Error: Prompt cannot be empty.");
      process.exit(1);
    }

    const { agent, sourcePath, sourceType } = await resolveAgent(fileCandidate);
    if (sourcePath) {
      console.log(`[Liate] Running ${sourceType} agent from ${sourcePath} ...`);
    } else {
      console.log(`[Liate] Running ephemeral sovereign agent ...`);
    }

    const start = Date.now();
    try {
      const result = await agent.run(prompt);

      if (result.thought) {
        console.log(`\n[Reasoning]:\n${result.thought}`);
      }

      console.log(`\n${result.text}\n`);
      console.log(`[Completed in ${Date.now() - start}ms | Steps: ${result.totalSteps} | Model: ${result.model}]`);
    } catch (err: any) {
      console.error(`\n[Execution Error]: ${err.message}`);
      process.exit(1);
    } finally {
      await agent.close();
    }
    return;
  }

  // 2. Command: chat
  if (command === "chat") {
    const fileCandidate = args[1];
    const { agent, sourcePath, sourceType } = await resolveAgent(fileCandidate);

    if (sourcePath) {
      console.log(`[Liate] Interactive chat loaded from ${sourcePath} (${sourceType})`);
    } else {
      console.log(`[Liate] Interactive chat loaded (ephemeral sovereign agent)`);
    }

    console.log("Type 'exit' or press Ctrl+C to quit.\n");

    const rl = readline.createInterface({ input, output });

    try {
      while (true) {
        const userInput = await rl.question("liate > ");
        const trimmed = userInput.trim();

        if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit" || trimmed.toLowerCase() === "q") {
          console.log("Session ended.");
          break;
        }

        if (!trimmed) continue;

        const start = Date.now();
        try {
          const result = await agent.run(trimmed);
          console.log(`\n${result.text}\n`);
          console.log(`[${Date.now() - start}ms | Steps: ${result.totalSteps}]\n`);
        } catch (err: any) {
          console.error(`\n[Error]: ${err.message}\n`);
        }
      }
    } finally {
      rl.close();
      await agent.close();
    }
    return;
  }

  // 3. Command: serve
  if (command === "serve") {
    let port = 7071;
    const portFlagIndex = args.indexOf("--port");
    if (portFlagIndex !== -1 && args[portFlagIndex + 1]) {
      const parsedPort = Number(args[portFlagIndex + 1]);
      if (!isNaN(parsedPort) && parsedPort > 0) {
        port = parsedPort;
      }
    }

    process.env.PORT = String(port);

    console.log(`[Liate] Booting Edge Runtime Server on port ${port} ...`);
    const { startServer } = await import("@/runtime/hono");
    startServer(port);
    return;
  }

  // Unknown command fallback
  console.error(`Unknown command: '${command}'`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error("[Liate CLI Fatal Error]:", err.message);
  process.exit(1);
});

