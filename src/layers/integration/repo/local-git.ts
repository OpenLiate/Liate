import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { RepoContext, RepoOptions } from "@/layers/integration/repo/resolver";

export function getLocalGitContext(dir: string, options?: RepoOptions): RepoContext {
  let branch = "main";
  let recentCommits: string[] = [];
  let files: string[] = [];
  let readme = "";

  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {}

  try {
    const commitLimit = typeof options?.commits === "number" ? options.commits : 5;
    const commitLog = execSync(`git log -n ${commitLimit} --oneline`, {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    recentCommits = commitLog.split("\n").filter(Boolean);
  } catch {}

  try {
    const gitFiles = execSync("git ls-files", {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    files = gitFiles.split("\n").filter(Boolean).slice(0, 100);
  } catch {}

  if (files.length === 0 && fs.existsSync(dir)) {
    try {
      files = fs.readdirSync(dir).filter((f) => !f.startsWith(".")).slice(0, 100);
    } catch {}
  }

  for (const rName of ["README.md", "readme.md", "README", "readme.txt"]) {
    const readmePath = path.join(dir, rName);
    if (fs.existsSync(readmePath)) {
      try {
        readme = fs.readFileSync(readmePath, "utf-8").slice(0, 2000);
        break;
      } catch {}
    }
  }

  return { repo: dir, branch, files, readme, recentCommits };
}
