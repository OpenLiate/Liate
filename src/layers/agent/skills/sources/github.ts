import type { SkillSourceResult } from "@/layers/agent/skills/sources/local";

export async function resolveGitHubSkill(id: string, idParts: string[]): Promise<SkillSourceResult | null> {
  if (idParts.length < 2) return null;

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
    `https://raw.githubusercontent.com/${owner}/${repo}/master/SKILL.md`
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.includes("404: Not Found")) {
          return {
            name: targetSkill || `${owner}/${repo}`,
            slug: id,
            instructions: text,
            source: "github"
          };
        }
      }
    } catch {
      // Try next candidate
    }
  }

  // Dynamic GitHub Tree discovery
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
      {
        headers: { "User-Agent": "OpenLiate" },
        signal: AbortSignal.timeout(6000)
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
          return {
            name: targetSkill || `${owner}/${repo}`,
            slug: id,
            instructions: text,
            source: "github"
          };
        }
      }
    }
  } catch {
    // Fall through
  }

  return null;
}
