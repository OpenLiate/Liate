import fs from "node:fs";
import path from "node:path";
import type { KnowledgeDoc, KnowledgeSourceDefinition } from "@/layers/integration/types";

const ALLOWED_EXTENSIONS = new Set([".md", ".txt", ".json", ".csv", ".yaml", ".yml"]);

function scanDir(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          results.push(...scanDir(full));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) {
          results.push(full);
        }
      }
    }
  } catch {}
  return results;
}

export const localFilesKnowledgeSource: KnowledgeSourceDefinition = {
  id: "local-files",
  name: "Local Files, Directories & Inline Snippets",
  matches: () => true,
  load: async (item: string, baseDir: string): Promise<KnowledgeDoc[]> => {
    const docs: KnowledgeDoc[] = [];
    const resolved = path.isAbsolute(item) ? item : path.resolve(baseDir, item);

    if (fs.existsSync(resolved)) {
      const stats = fs.statSync(resolved);
      if (stats.isDirectory()) {
        const files = scanDir(resolved);
        for (const file of files.slice(0, 50)) {
          try {
            const content = fs.readFileSync(file, "utf-8").slice(0, 50000);
            const rel = path.relative(baseDir, file);
            docs.push({
              id: rel,
              source: rel,
              title: path.basename(file),
              content
            });
          } catch {}
        }
      } else if (stats.isFile()) {
        try {
          const content = fs.readFileSync(resolved, "utf-8").slice(0, 50000);
          docs.push({
            id: item,
            source: item,
            title: path.basename(resolved),
            content
          });
        } catch {}
      }
    } else {
      docs.push({
        id: `inline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        source: "inline",
        content: item
      });
    }

    return docs;
  }
};
