import type { SkillSourceResult } from "@/layers/agent/skills/sources/local";

export interface SkillSearchResult {
  id: string;
  source: string;
  skillId: string;
  name: string;
  installs?: number;
}

export async function resolveSkillsSh(id: string, idParts: string[]): Promise<SkillSourceResult | null> {
  if (idParts.length < 2) return null;

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
        return {
          name: idParts.slice(1).join("-"),
          slug: id,
          instructions: contents,
          source: "skills.sh"
        };
      }
    }
  } catch {
    // Fall through to GitHub discovery
  }

  return null;
}

export async function searchSkillsSh(query: string, limit = 10): Promise<SkillSearchResult[]> {
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
