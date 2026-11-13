// src/scaffold/project.ts
// Liate v0.1.2 — Project Scaffolder (TypeScript & Python L·I·A·T·E Agent Templates)

import fs from "node:fs";
import path from "node:path";

export interface ScaffoldOptions {
  name: string;
  targetDir?: string;
  lang?: "ts" | "py";
  skills?: string[];
}

export interface ScaffoldResult {
  projectName: string;
  className: string;
  lang: "ts" | "py";
  projectDir: string;
  files: string[];
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function scaffoldProject(options: ScaffoldOptions): ScaffoldResult {
  const rawName = options.name.trim();
  if (!rawName) {
    throw new Error("Agent project name is required.");
  }

  const cleanName = rawName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!cleanName) {
    throw new Error(
      `Invalid agent project name '${rawName}'. Use alphanumeric characters and hyphens.`
    );
  }

  const className =
    toPascalCase(cleanName) + (cleanName.toLowerCase().endsWith("agent") ? "" : "Agent");
  const targetDir = options.targetDir
    ? path.resolve(options.targetDir)
    : path.resolve(process.cwd(), cleanName);
  const lang: "ts" | "py" = options.lang === "py" ? "py" : "ts";
  const skills = options.skills?.length ? options.skills : ["vercel-labs/skills/find-skills"];

  if (fs.existsSync(targetDir)) {
    const existing = fs.readdirSync(targetDir);
    if (existing.length > 0) {
      throw new Error(`Target directory '${targetDir}' already exists and is not empty.`);
    }
  } else {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let filesToWrite: Record<string, string>;

  if (lang === "py") {
    const pyprojectContent = `[project]
name = "${cleanName}"
version = "0.1.0"
description = "AI Agent built with Liate"
requires-python = ">=3.9"
dependencies = [
    "liate>=0.1.0"
]
`;

    const agentPyContent = `import os
import sys
from liate import liate

class ${className}(liate):
    """${className} — Sovereign AI Agent (L · I · A · T · E)"""

    L = "sarvam/sarvam-105b-conversations"
    I = { "memory": "sessions/${cleanName}" }
    A = {
        "name": "${cleanName}",
        "intent": "AI Agent built with OpenLiate",
        "max_steps": 5,
        "skills": ${JSON.stringify(skills)},
    }
    T = {}
    E = { "SARVAM_API_KEY": os.environ.get("SARVAM_API_KEY", "$SARVAM_API_KEY") }

def main():
    agent = ${className}()
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Namaste, who are you?"
    result = agent.run(prompt)
    print(result)

if __name__ == "__main__":
    main()
`;

    filesToWrite = {
      "pyproject.toml": pyprojectContent,
      "agent.py": agentPyContent,
      ".env.example": "SARVAM_API_KEY=your_sarvam_api_key_here\n",
      "README.md": `# ${cleanName}\n\nAI Agent scaffolded with **Liate**.\n\n\`\`\`bash\npython agent.py "Hello!"\n\`\`\`\n`,
    };
  } else {
    const pkgJson = {
      name: cleanName,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        start: "bun run agent.ts",
        serve: "liate serve agent.json --port 7071",
      },
      dependencies: {
        "@openliate/liate": "^0.1.0",
      },
    };

    const agentJson = {
      L: "sarvam/sarvam-105b-conversations",
      I: { memory: `sessions/${cleanName}` },
      A: {
        name: cleanName,
        intent: "Sovereign AI Agent built with Liate",
        maxSteps: 5,
        skills,
      },
      T: {},
      E: { SARVAM_API_KEY: "$SARVAM_API_KEY" },
    };

    const agentTsContent = `import { liate } from "@openliate/liate";

export class ${className} extends liate {
  L = "sarvam/sarvam-105b-conversations";
  I = { memory: "sessions/${cleanName}" };
  A = {
    name: "${cleanName}",
    intent: "Sovereign AI Agent built with Liate",
    maxSteps: 5,
    skills: ${JSON.stringify(skills)},
  };
  T = {};
  E = { SARVAM_API_KEY: "$SARVAM_API_KEY" };
}

if (import.meta.main) {
  const agent = new ${className}();
  const prompt = process.argv.slice(2).join(" ") || "Namaste, confirm you are running Liate.";
  const result = await agent.run(prompt);
  console.log(result.text);
  await agent.close();
}
`;

    filesToWrite = {
      "package.json": JSON.stringify(pkgJson, null, 2) + "\n",
      "agent.json": JSON.stringify(agentJson, null, 2) + "\n",
      "agent.ts": agentTsContent,
      ".env.example": "SARVAM_API_KEY=your_sarvam_api_key_here\n",
      "README.md": `# ${cleanName}\n\nAI Agent scaffolded with **Liate**.\n\n\`\`\`bash\nliate run agent.json "Hello!"\n\`\`\`\n`,
    };
  }

  const createdFiles: string[] = [];
  for (const [relPath, content] of Object.entries(filesToWrite)) {
    const fullPath = path.join(targetDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
    createdFiles.push(relPath);
  }

  return {
    projectName: cleanName,
    className,
    lang,
    projectDir: targetDir,
    files: createdFiles,
  };
}

