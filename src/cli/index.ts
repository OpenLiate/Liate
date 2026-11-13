#!/usr/bin/env node
// src/cli/index.ts
// Liate v0.1.0 — Unified Developer CLI Engine
// Commands: run, chat, serve, hub

import { resolveAgent } from "@/cli/resolver";
import { VERSION } from "@/core/version";
import { EnvironmentResolver } from "@/layers/environment/sandbox";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function printHelp(): void {
  console.log(`
Liate — Open Source Backend Layer for AI Agents (v${VERSION})
From India, For India, Beyond India 🇮🇳 🌍

Usage:
  liate <command> [options]

Commands:
  run [file] <prompt>    Execute an agent with a single prompt
  chat [file]            Start an interactive multi-turn REPL chat session
  serve [file] [--port]  Start the Hono edge runtime server (default: 7071)
  create <name> [--py]   Create a new Liate agent project (aliases: init, new)
  skills <cmd> [arg]     Manage skills.sh skills (find, add, update)
  env <set|list|rm>      Manage local .env.local secrets safely
  hub                    List available local hub agent templates

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

    // Check if first argument is a file or hub agent name
    const cwd = process.cwd();
    const isHubCandidate = existsSync(resolve(cwd, "hub", "agents", remaining[0]));
    if (
      remaining[0].endsWith(".ts") ||
      remaining[0].endsWith(".json") ||
      remaining[0].endsWith(".js") ||
      existsSync(remaining[0]) ||
      isHubCandidate
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

  // 4. Command: create (aliases: init, new)
  if (command === "create" || command === "init" || command === "new") {
    const rest = args.slice(1);
    const isPy = rest.includes("--py") || rest.includes("--python");
    const name = rest.find((a) => !a.startsWith("-"));
    if (!name) {
      console.error("Error: Missing agent name. Usage: liate create <name> [--py]");
      process.exit(1);
    }
    const { scaffoldProject } = await import("@/scaffold/project");
    const result = scaffoldProject({ name, lang: isPy ? "py" : "ts" });
    console.log(`\n[Liate] Scaffolded ${result.lang.toUpperCase()} agent '${result.projectName}' (${result.className})`);
    console.log(`Location: ${result.projectDir}`);
    console.log(`Files:    ${result.files.join(", ")}\n`);
    return;
  }

  // 5. Command: skills (find | add | update)
  if (command === "skills") {
    const sub = args[1];
    const arg = args.slice(2).join(" ").trim();
    const { SkillResolver } = await import("@/layers/agent/skills");

    if (sub === "find" || sub === "search") {
      if (!arg) {
        console.error("Usage: liate skills find <query>");
        process.exit(1);
      }
      const results = await SkillResolver.search(arg, 10);
      console.log(`\n[skills.sh] Found ${results.length} skills for "${arg}":\n`);
      for (const r of results) {
        const installs = r.installs != null ? ` (${r.installs.toLocaleString()} installs)` : "";
        console.log(`  • ${r.id}${installs}`);
      }
      console.log(`\nTo add a skill:\n  liate skills add <id>\n`);
      return;
    }

    if (sub === "add") {
      if (!arg) {
        console.error("Usage: liate skills add <owner/repo/skill>");
        process.exit(1);
      }
      const res = await SkillResolver.add(arg);
      console.log(`\n[Liate] Added skill '${res.skill.name}' (${res.skill.instructions.length} bytes)`);
      console.log(`Saved: ${res.savedPath}`);
      if (res.updatedAgentJson) console.log(`Updated: agent.json (A.skills)\n`);
      return;
    }

    if (sub === "update") {
      const res = await SkillResolver.update();
      console.log(`\n[Liate] Updated ${res.updated.length} skill(s) from upstream.`);
      for (const u of res.updated) {
        console.log(`  • ${u.slug} (${u.source}, ${u.bytes} bytes)`);
      }
      console.log();
      return;
    }

    console.error("Usage: liate skills <find|add|update> [arg]");
    process.exit(1);
  }

  // 6. Command: env (set | list | rm)
  if (command === "env") {
    const sub = (args[1] || "list").toLowerCase();
    const envPath = resolve(process.cwd(), ".env.local");

    if (sub === "set" || sub === "add") {
      const pair = args.slice(2).find((a) => a.includes("="));
      if (!pair) {
        console.error("Usage: liate env set KEY=VALUE");
        process.exit(1);
      }
      const eq = pair.indexOf("=");
      const key = pair.slice(0, eq).trim();
      const val = pair.slice(eq + 1).replace(/^["']|["']$/g, "");
      let content = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
      const re = new RegExp(`^${key}=.*$`, "m");
      content = re.test(content)
        ? content.replace(re, `${key}="${val}"`)
        : `${content.trim()}\n${key}="${val}"\n`;
      writeFileSync(envPath, content.trim() + "\n", "utf-8");
      const masked = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : "******";
      console.log(`[Liate] Saved '${key}' (${masked}) in .env.local`);
      return;
    }

    if (sub === "rm" || sub === "remove" || sub === "delete") {
      const key = args[2]?.trim();
      if (!key) {
        console.error("Usage: liate env rm <KEY>");
        process.exit(1);
      }
      if (existsSync(envPath)) {
        const lines = readFileSync(envPath, "utf-8")
          .split(/\r?\n/)
          .filter((l) => !l.startsWith(`${key}=`));
        writeFileSync(envPath, lines.join("\n").trim() + "\n", "utf-8");
      }
      console.log(`[Liate] Removed '${key}' from .env.local`);
      return;
    }

    if (!existsSync(envPath)) {
      console.log("\n[Liate] No .env.local found. Add a key with: liate env set KEY=VALUE\n");
      return;
    }
    const lines = readFileSync(envPath, "utf-8")
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="));
    console.log(`\n[Liate] .env.local (${lines.length} keys):`);
    for (const line of lines) {
      const eq = line.indexOf("=");
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      const masked = v.length > 8 ? `${v.slice(0, 4)}...${v.slice(-4)}` : "******";
      console.log(`  • ${k}: ${masked}`);
    }
    console.log();
    return;
  }

  // 7. Command: hub
  if (command === "hub") {
    const { listLocalHubAgents } = await import("@/cli/resolver");
    const agents = listLocalHubAgents();

    if (agents.length === 0) {
      console.log("[Liate Hub] No local hub agents found in hub/agents.");
      process.exit(0);
    }

    console.log(`\nLiate Hub — Local Sovereign Agent Templates (${agents.length} available):\n`);
    for (const a of agents) {
      console.log(`  • ${a.id.padEnd(16)} [${a.model}]`);
      console.log(`    ${a.intent}\n`);
    }
    console.log(`To run a hub agent:\n  liate run ${agents[0].id} "<prompt>"\n`);
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

