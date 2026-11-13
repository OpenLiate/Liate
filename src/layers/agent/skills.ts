// src/layers/agent/skills.ts
// Layer [A] Dynamic Skill Resolver (skills.sh 1.26M+ skills, GitHub, HTTPS & Local SKILL.md)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";

export interface SkillSearchResult {
  id: string;
  source: string;
  skillId: string;
  name: string;
  installs?: number;
}

export interface ResolvedSkill {
  name: string;
  slug: string;
  instructions: string;
  source: "skills.sh" | "github" | "local" | "inline";
  cachedAt?: number;
}

export type EdgeSkill = ResolvedSkill;

const skillMemoryCache = new Map<string, ResolvedSkill>();

export class SkillResolver {
  /**
   * Dynamically fetch and resolve a skills.sh slug, GitHub reference, HTTPS URL, or local SKILL.md path.
   */
  public static async resolve(slugOrUrl: string): Promise<ResolvedSkill> {
    const cleanSlug = slugOrUrl.trim();

    if (skillMemoryCache.has(cleanSlug)) {
      return skillMemoryCache.get(cleanSlug)!;
    }

    // 1. Local file path fallback
    if (
      cleanSlug.startsWith("./") ||
      cleanSlug.startsWith("../") ||
      cleanSlug.startsWith("/") ||
      cleanSlug.endsWith(".md")
    ) {
      const fullPath = resolvePath(process.cwd(), cleanSlug);
      if (existsSync(fullPath)) {
        const text = readFileSync(fullPath, "utf-8");
        const skill: ResolvedSkill = {
          name: cleanSlug.split(/[\\/]/).pop()?.replace(/\.md$/i, "") || "local-skill",
          slug: cleanSlug,
          instructions: text,
          source: "local",
          cachedAt: Date.now(),
        };
        skillMemoryCache.set(cleanSlug, skill);
        return skill;
      }
    }

    // 2. Direct HTTPS URL
    if (cleanSlug.startsWith("http://") || cleanSlug.startsWith("https://")) {
      try {
        const res = await fetch(cleanSlug, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const text = await res.text();
          const skill: ResolvedSkill = {
            name: cleanSlug.split("/").pop()?.replace(/\.md$/i, "") || "remote-skill",
            slug: cleanSlug,
            instructions: text,
            source: "skills.sh",
            cachedAt: Date.now(),
          };
          skillMemoryCache.set(cleanSlug, skill);
          return skill;
        }
      } catch {
        // Continue to fallback
      }
    }

    // 3. skills.sh / GitHub slug (e.g. "vercel-labs/find-skills" or "skills.sh/vercel-labs/find-skills")
    const id = cleanSlug.replace(/^skills\.sh\//, "").replace(/^github:/, "");
    const idParts = id.split("/").filter(Boolean);

    if (idParts.length >= 2) {
      // 3a. skills.sh API
      try {
        const apiUrl = `https://skills.sh/api/v1/skills/${id}`;
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data: any = await res.json();
          const skillFile =
            data.files?.find((f: any) => f.path === "SKILL.md" || f.path?.endsWith(".md")) ||
            data.files?.[0];
          const contents = skillFile?.contents || data.instructions || data.content;
          if (contents) {
            const skill: ResolvedSkill = {
              name: idParts.slice(1).join("-"),
              slug: id,
              instructions: contents,
              source: "skills.sh",
              cachedAt: Date.now(),
            };
            skillMemoryCache.set(cleanSlug, skill);
            return skill;
          }
        }
      } catch {
        // Fallback to GitHub raw
      }

      // 3b. GitHub Raw common paths
      const owner = idParts[0];
      const repo = idParts[1];
      const targetSkill = idParts.slice(2).join("/") || repo;

      const candidateUrls = [
        `https://raw.githubusercontent.com/${owner}/${repo}/main/skills/${targetSkill}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/${targetSkill}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/skills/productivity/${targetSkill}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/skills/engineering/${targetSkill}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/skills/design/${targetSkill}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/skills/${repo}/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/SKILL.md`,
      ];

      for (const url of candidateUrls) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            const text = await res.text();
            if (text && !text.includes("404: Not Found")) {
              const skill: ResolvedSkill = {
                name: targetSkill || `${owner}/${repo}`,
                slug: id,
                instructions: text,
                source: "github",
                cachedAt: Date.now(),
              };
              skillMemoryCache.set(cleanSlug, skill);
              return skill;
            }
          }
        } catch {
          // Try next candidate
        }
      }

      // 3c. Dynamic GitHub Tree discovery
      try {
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
          {
            headers: { "User-Agent": "OpenLiate" },
            signal: AbortSignal.timeout(6000),
          }
        );
        if (treeRes.ok) {
          const treeData: any = await treeRes.json();
          const shortTarget = targetSkill.replace(/^[a-z0-9]+-/i, "").toLowerCase();
          const matchedPath = treeData.tree?.find((item: any) => {
            const p = String(item.path || "").toLowerCase();
            const isSkill = p.endsWith("skill.md") || p.endsWith("skill");
            return (
              isSkill &&
              (p.includes(targetSkill.toLowerCase()) ||
                (shortTarget.length > 4 && p.includes(shortTarget)))
            );
          })?.path;

          if (matchedPath) {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${matchedPath}`;
            const fileRes = await fetch(rawUrl, { signal: AbortSignal.timeout(5000) });
            if (fileRes.ok) {
              const text = await fileRes.text();
              const skill: ResolvedSkill = {
                name: targetSkill || `${owner}/${repo}`,
                slug: id,
                instructions: text,
                source: "github",
                cachedAt: Date.now(),
              };
              skillMemoryCache.set(cleanSlug, skill);
              return skill;
            }
          }
        }
      } catch {
        // Fallback to inline slug
      }
    }

    const resolvedName =
      idParts[idParts.length - 1] || cleanSlug.split("/").pop()?.replace(/\.md$/i, "") || "skill";
    return {
      name: resolvedName,
      slug: cleanSlug,
      instructions: cleanSlug,
      source: "inline",
      cachedAt: Date.now(),
    };
  }

  public static async resolveAll(skills: string[]): Promise<ResolvedSkill[]> {
    if (!skills || skills.length === 0) return [];
    return Promise.all(skills.map((s) => this.resolve(s)));
  }

  public static formatSystemPrompt(skills: ResolvedSkill[]): string {
    if (!skills || skills.length === 0) return "";
    const blocks = skills.map(
      (s) => `### Skill: ${s.name} (${s.source}: ${s.slug})\n${s.instructions.trim()}`
    );
    return `\n\n<skills>\n${blocks.join("\n\n")}\n</skills>`;
  }

  /**
   * Search the public skills.sh registry (Algolia-backed, no auth required).
   */
  public static async search(query: string, limit = 10): Promise<SkillSearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const url = `https://skills.sh/api/search?q=${encodeURIComponent(q)}&limit=${Math.min(Math.max(limit, 1), 25)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      throw new Error(`skills.sh search failed (${res.status})`);
    }
    const data = (await res.json()) as { skills?: SkillSearchResult[] };
    return (data.skills || []).slice(0, limit);
  }

  /**
   * Resolve a skill from skills.sh/GitHub, save SKILL.md to .liate/skills/, and add to agent.json A.skills.
   */
  public static async add(
    slugOrUrl: string,
    options: { cwd?: string; agentFile?: string } = {}
  ): Promise<{ skill: ResolvedSkill; savedPath: string; updatedAgentJson: boolean }> {
    const cwd = options.cwd || process.cwd();
    const skill = await this.resolve(slugOrUrl);
    if (skill.source === "inline") {
      throw new Error(`Could not fetch SKILL.md for '${slugOrUrl}' from skills.sh or GitHub.`);
    }

    const safeSlug = skill.slug.replace(/[^a-zA-Z0-9_/-]/g, "-").replace(/^\/+|\/+$/g, "");
    const savedPath = resolvePath(cwd, ".liate", "skills", safeSlug, "SKILL.md");
    mkdirSync(dirname(savedPath), { recursive: true });
    writeFileSync(savedPath, skill.instructions, "utf-8");

    let updatedAgentJson = false;
    const agentPath = resolvePath(cwd, options.agentFile || "agent.json");
    if (existsSync(agentPath)) {
      const raw = JSON.parse(readFileSync(agentPath, "utf-8"));
      const aKey = raw.A ? "A" : raw.Agent ? "Agent" : raw.agent ? "agent" : "A";
      raw[aKey] = typeof raw[aKey] === "object" && raw[aKey] ? raw[aKey] : { name: String(raw[aKey] || "agent") };
      const existing: string[] = Array.isArray(raw[aKey].skills) ? raw[aKey].skills : [];
      if (!existing.includes(slugOrUrl)) {
        raw[aKey].skills = [...existing, slugOrUrl];
        writeFileSync(agentPath, JSON.stringify(raw, null, 2) + "\n", "utf-8");
        updatedAgentJson = true;
      }
    }

    return { skill, savedPath, updatedAgentJson };
  }

  /**
   * Refresh all skills listed in agent.json from upstream GitHub / HTTPS sources.
   */
  public static async update(
    options: { cwd?: string; agentFile?: string } = {}
  ): Promise<{ updated: { slug: string; source: string; bytes: number }[] }> {
    const cwd = options.cwd || process.cwd();
    const agentPath = resolvePath(cwd, options.agentFile || "agent.json");
    if (!existsSync(agentPath)) {
      return { updated: [] };
    }
    const raw = JSON.parse(readFileSync(agentPath, "utf-8"));
    const aObj = raw.A || raw.Agent || raw.agent || {};
    const slugs: string[] = Array.isArray(aObj.skills) ? aObj.skills : [];

    this.clearCache();
    const updated: { slug: string; source: string; bytes: number }[] = [];
    for (const slug of slugs) {
      const { skill } = await this.add(slug, { cwd, agentFile: options.agentFile });
      updated.push({ slug, source: skill.source, bytes: skill.instructions.length });
    }
    return { updated };
  }

  public static listCached(): ResolvedSkill[] {
    return Array.from(skillMemoryCache.values());
  }

  public static clearCache(): void {
    skillMemoryCache.clear();
  }
}

export const EdgeSkillResolver = SkillResolver;

