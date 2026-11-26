import { existsSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

export interface SkillSourceResult {
  name: string;
  slug: string;
  instructions: string;
  source: "skills.sh" | "github" | "local" | "inline";
}

export async function resolveLocalSkill(cleanSlug: string): Promise<SkillSourceResult | null> {
  if (
    !cleanSlug.startsWith("./") &&
    !cleanSlug.startsWith("../") &&
    !cleanSlug.startsWith("/") &&
    !cleanSlug.endsWith(".md")
  ) {
    return null;
  }

  const fullPath = resolvePath(process.cwd(), cleanSlug);
  if (!existsSync(fullPath)) {
    return null;
  }

  const text = readFileSync(fullPath, "utf-8");
  return {
    name: cleanSlug.split(/[\\/]/).pop()?.replace(/\.md$/i, "") || "local-skill",
    slug: cleanSlug,
    instructions: text,
    source: "local"
  };
}
