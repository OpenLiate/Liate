import type { SkillSourceResult } from "@/layers/agent/skills/sources/local";

export async function resolveHttpsSkill(cleanSlug: string): Promise<SkillSourceResult | null> {
  if (!cleanSlug.startsWith("http://") && !cleanSlug.startsWith("https://")) {
    return null;
  }

  try {
    const res = await fetch(cleanSlug, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const text = await res.text();
      return {
        name: cleanSlug.split("/").pop()?.replace(/\.md$/i, "") || "remote-skill",
        slug: cleanSlug,
        instructions: text,
        source: "skills.sh"
      };
    }
  } catch {
    // Fall through to next skill source
  }

  return null;
}
