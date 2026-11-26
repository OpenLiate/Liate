import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { resolveLocalSkill } from "@/layers/agent/skills/sources/local";
import { resolveHttpsSkill } from "@/layers/agent/skills/sources/https";
import { resolveSkillsSh, searchSkillsSh, type SkillSearchResult } from "@/layers/agent/skills/sources/skills-sh";
import { resolveGitHubSkill } from "@/layers/agent/skills/sources/github";

export type { SkillSearchResult };

export interface ResolvedSkill {
  name: string;
  slug: string;
  instructions: string;
  source: "skills.sh" | "github" | "local" | "inline";
  cachedAt?: number;
}

export type EdgeSkill = ResolvedSkill;

const skillMemoryCache = new Map<string, ResolvedSkill>();

/**
 * Layer [A] Dynamic Skill Resolver
 * Orchestrates local, HTTPS, skills.sh, and GitHub skill sources.
 */
export class SkillResolver {
  public static async resolve(slugOrUrl: string): Promise<ResolvedSkill> {
    const cleanSlug = slugOrUrl.trim();
    if (skillMemoryCache.has(cleanSlug)) {
      return skillMemoryCache.get(cleanSlug)!;
    }

    const local = await resolveLocalSkill(cleanSlug);
    if (local) {
      const skill: ResolvedSkill = { ...local, cachedAt: Date.now() };
      skillMemoryCache.set(cleanSlug, skill);
      return skill;
    }

    const httpsSkill = await resolveHttpsSkill(cleanSlug);
    if (httpsSkill) {
      const skill: ResolvedSkill = { ...httpsSkill, cachedAt: Date.now() };
      skillMemoryCache.set(cleanSlug, skill);
      return skill;
    }

    const id = cleanSlug.replace(/^skills\.sh\//, "").replace(/^github:/, "");
    const idParts = id.split("/").filter(Boolean);

    const skillsSh = await resolveSkillsSh(id, idParts);
    if (skillsSh) {
      const skill: ResolvedSkill = { ...skillsSh, cachedAt: Date.now() };
      skillMemoryCache.set(cleanSlug, skill);
      return skill;
    }

    const githubSkill = await resolveGitHubSkill(id, idParts);
    if (githubSkill) {
      const skill: ResolvedSkill = { ...githubSkill, cachedAt: Date.now() };
      skillMemoryCache.set(cleanSlug, skill);
      return skill;
    }

    const resolvedName =
      idParts[idParts.length - 1] || cleanSlug.split("/").pop()?.replace(/\.md$/i, "") || "skill";
    return {
      name: resolvedName,
      slug: cleanSlug,
      instructions: cleanSlug,
      source: "inline",
      cachedAt: Date.now()
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

  public static async search(query: string, limit = 10): Promise<SkillSearchResult[]> {
    return searchSkillsSh(query, limit);
  }

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
