// src/routes/skills.ts
// HTTP endpoints for skills.sh search, listing cached skills, and resolving SKILL.md

import { Hono } from "hono";
import { SkillResolver } from "@/layers/agent/skills";

export const skillsRouter = new Hono();

/**
 * GET /skills
 * List all cached skills
 */
skillsRouter.get("/", (c) => {
  const cached = SkillResolver.listCached();
  return c.json({
    status: "ok",
    count: cached.length,
    skills: cached.map((s) => ({
      name: s.name,
      slug: s.slug,
      source: s.source,
      cachedAt: s.cachedAt,
    })),
  });
});

/**
 * GET /skills/search?q=react&limit=10
 * Search public skills.sh registry
 */
skillsRouter.get("/search", async (c) => {
  const q = c.req.query("q") || "";
  const limit = Number(c.req.query("limit") || 10);
  if (!q.trim()) {
    return c.json({ error: "Missing query parameter 'q'" }, 400);
  }
  try {
    const skills = await SkillResolver.search(q, Number.isFinite(limit) ? limit : 10);
    return c.json({ status: "ok", query: q, count: skills.length, skills });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

/**
 * POST /skills/resolve
 * Resolve a skills.sh slug, GitHub reference, or HTTPS URL
 */
skillsRouter.post("/resolve", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const slug = body.slug || body.url || body.skill;

  if (!slug) {
    return c.json({ error: "Missing skill slug or URL in request body." }, 400);
  }

  try {
    const resolved = await SkillResolver.resolve(slug);
    return c.json({
      status: "ok",
      resolved: {
        name: resolved.name,
        slug: resolved.slug,
        source: resolved.source,
        bytes: resolved.instructions.length,
        instructionsPreview: resolved.instructions.slice(0, 300),
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

