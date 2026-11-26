import type { RemoteSessionAdapter, SessionAdapterDefinition, SessionData } from "@/layers/integration/types";

function resolvePostgresTarget(target: string): { connectionUrl: string; sessionId: string } {
  const [rawTarget, fragment] = target.split("#");

  if (rawTarget.startsWith("neon://")) {
    const sessionId = rawTarget.slice("neon://".length) || fragment || "default";
    const connectionUrl =
      process.env.NEON_DATABASE_URL?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      "";
    return { connectionUrl, sessionId };
  }

  if (rawTarget.startsWith("supabase://")) {
    const sessionId = rawTarget.slice("supabase://".length) || fragment || "default";
    const connectionUrl =
      process.env.SUPABASE_DB_URL?.trim() ||
      process.env.SUPABASE_DATABASE_URL?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      "";
    return { connectionUrl, sessionId };
  }

  return {
    connectionUrl: rawTarget,
    sessionId: fragment || "default"
  };
}

function createPostgresAdapter(connectionUrl: string): RemoteSessionAdapter {
  let sqlClient: any = null;
  let initialized = false;

  async function getSql() {
    if (!connectionUrl) {
      throw new Error(
        "[Liate Memory Error]: Missing PostgreSQL connection string. Set DATABASE_URL, NEON_DATABASE_URL, or SUPABASE_DB_URL, or pass a postgresql:// URI."
      );
    }
    if (!sqlClient) {
      const BunSQL = (globalThis as any).Bun?.SQL;
      if (!BunSQL) {
        throw new Error("[Liate Memory Error]: Native Bun.SQL is required for PostgreSQL session persistence.");
      }
      sqlClient = new BunSQL(connectionUrl);
    }
    if (!initialized) {
      await sqlClient.unsafe(`
        CREATE TABLE IF NOT EXISTS liate_sessions (
          session_id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          metadata TEXT NOT NULL,
          messages TEXT NOT NULL,
          state TEXT NOT NULL
        )
      `);
      initialized = true;
    }
    return sqlClient;
  }

  return {
    load: async (sessionId: string): Promise<SessionData | null> => {
      const sql = await getSql();
      const rows = await sql`
        SELECT session_id, created_at, updated_at, metadata, messages, state
        FROM liate_sessions
        WHERE session_id = ${sessionId}
      `;
      if (!rows || rows.length === 0) return null;
      const row = rows[0];
      return {
        sessionId: row.session_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: JSON.parse(row.metadata || "{}"),
        messages: JSON.parse(row.messages || "[]"),
        state: JSON.parse(row.state || "{}")
      };
    },
    save: async (data: SessionData): Promise<void> => {
      const sql = await getSql();
      const metaJson = JSON.stringify(data.metadata || {});
      const msgJson = JSON.stringify(data.messages || []);
      const stateJson = JSON.stringify(data.state || {});
      await sql`
        INSERT INTO liate_sessions (session_id, created_at, updated_at, metadata, messages, state)
        VALUES (${data.sessionId}, ${data.createdAt}, ${data.updatedAt}, ${metaJson}, ${msgJson}, ${stateJson})
        ON CONFLICT (session_id) DO UPDATE SET
          updated_at = EXCLUDED.updated_at,
          metadata = EXCLUDED.metadata,
          messages = EXCLUDED.messages,
          state = EXCLUDED.state
      `;
    },
    close: async () => {
      if (sqlClient?.close) {
        await sqlClient.close();
        sqlClient = null;
        initialized = false;
      }
    }
  };
}

/**
 * Layer [I] PostgreSQL Session Adapter
 * Supports local PostgreSQL ("postgresql://...") and cloud Neon ("neon://<session>") / Supabase ("supabase://<session>").
 */
export const postgresSessionAdapter: SessionAdapterDefinition = {
  id: "postgres",
  name: "PostgreSQL / Neon / Supabase Session",
  matches: (target?: string) => {
    if (!target) return false;
    const base = target.split("#")[0].toLowerCase();
    return (
      base.startsWith("postgres://") ||
      base.startsWith("postgresql://") ||
      base.startsWith("neon://") ||
      base.startsWith("supabase://")
    );
  },
  create: (target?: string) => {
    const resolved = resolvePostgresTarget(target || "");
    return {
      sessionId: resolved.sessionId,
      adapter: createPostgresAdapter(resolved.connectionUrl),
      isInMemory: false
    };
  }
};
