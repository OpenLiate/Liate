import fs from "node:fs";
import path from "node:path";
import type { RemoteSessionAdapter, SessionAdapterDefinition, SessionData } from "@/layers/integration/types";

function parseSqliteTarget(target: string): { isCloud: boolean; location: string; sessionId: string } {
  const [rawLocation, fragment] = target.split("#");
  if (rawLocation.startsWith("libsql://")) {
    const cleanHost = rawLocation.replace(/^libsql:\/\//, "").replace(/\/+$/, "");
    return {
      isCloud: true,
      location: `https://${cleanHost}`,
      sessionId: fragment || "default"
    };
  }

  let filePath = rawLocation.replace(/^sqlite:\/\//, "");
  if (filePath !== ":memory:" && !path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }
  return {
    isCloud: false,
    location: filePath,
    sessionId: fragment || (filePath === ":memory:" ? "ephemeral" : path.basename(filePath, path.extname(filePath)))
  };
}

function createLocalSqliteAdapter(dbPath: string): RemoteSessionAdapter {
  let dbInstance: any = null;

  async function getDb() {
    if (dbInstance) return dbInstance;
    if (dbPath !== ":memory:") {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    const mod = await import("bun:sqlite");
    const db = new mod.Database(dbPath);
    db.run(`
      CREATE TABLE IF NOT EXISTS liate_sessions (
        session_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT NOT NULL,
        messages TEXT NOT NULL,
        state TEXT NOT NULL
      )
    `);
    dbInstance = db;
    return db;
  }

  return {
    load: async (sessionId: string): Promise<SessionData | null> => {
      const db = await getDb();
      const row = db
        .query("SELECT session_id, created_at, updated_at, metadata, messages, state FROM liate_sessions WHERE session_id = ?")
        .get(sessionId) as any;
      if (!row) return null;
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
      const db = await getDb();
      db.run(
        `INSERT INTO liate_sessions (session_id, created_at, updated_at, metadata, messages, state)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET
           updated_at = excluded.updated_at,
           metadata = excluded.metadata,
           messages = excluded.messages,
           state = excluded.state`,
        [
          data.sessionId,
          data.createdAt,
          data.updatedAt,
          JSON.stringify(data.metadata || {}),
          JSON.stringify(data.messages || []),
          JSON.stringify(data.state || {})
        ]
      );
    },
    close: () => {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    }
  };
}

function createTursoHttpAdapter(httpsBaseUrl: string): RemoteSessionAdapter {
  const pipelineUrl = `${httpsBaseUrl}/v2/pipeline`;

  async function execSql(sql: string, args: Array<string> = []) {
    const token = process.env.TURSO_AUTH_TOKEN?.trim();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(pipelineUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql,
              args: args.map((v) => ({ type: "text", value: String(v) }))
            }
          },
          { type: "close" }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Turso libSQL error (${res.status}): ${err}`);
    }
    return await res.json();
  }

  let initialized = false;
  async function ensureTable() {
    if (initialized) return;
    await execSql(`
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

  return {
    load: async (sessionId: string): Promise<SessionData | null> => {
      await ensureTable();
      const res: any = await execSql(
        "SELECT session_id, created_at, updated_at, metadata, messages, state FROM liate_sessions WHERE session_id = ?",
        [sessionId]
      );
      const rows = res?.results?.[0]?.response?.result?.rows;
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const r = rows[0];
      const cell = (i: number) => r[i]?.value ?? "";
      return {
        sessionId: cell(0),
        createdAt: cell(1),
        updatedAt: cell(2),
        metadata: JSON.parse(cell(3) || "{}"),
        messages: JSON.parse(cell(4) || "[]"),
        state: JSON.parse(cell(5) || "{}")
      };
    },
    save: async (data: SessionData): Promise<void> => {
      await ensureTable();
      await execSql(
        `INSERT INTO liate_sessions (session_id, created_at, updated_at, metadata, messages, state)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET
           updated_at = excluded.updated_at,
           metadata = excluded.metadata,
           messages = excluded.messages,
           state = excluded.state`,
        [
          data.sessionId,
          data.createdAt,
          data.updatedAt,
          JSON.stringify(data.metadata || {}),
          JSON.stringify(data.messages || []),
          JSON.stringify(data.state || {})
        ]
      );
    }
  };
}

/**
 * Layer [I] SQLite & Turso libSQL Session Adapter
 * Supports local files ("sqlite://.liate/chat.db", "chat.db", "chat.sqlite")
 * and cloud Turso ("libsql://my-db.turso.io").
 */
export const sqliteSessionAdapter: SessionAdapterDefinition = {
  id: "sqlite",
  name: "SQLite / Turso libSQL Session",
  matches: (target?: string) => {
    if (!target) return false;
    const base = target.split("#")[0].toLowerCase();
    return (
      base.startsWith("sqlite://") ||
      base.startsWith("libsql://") ||
      base.endsWith(".db") ||
      base.endsWith(".sqlite") ||
      base.endsWith(".sqlite3")
    );
  },
  create: (target?: string) => {
    const parsed = parseSqliteTarget(target || "sqlite://.liate/sessions.db");
    return {
      sessionId: parsed.sessionId,
      adapter: parsed.isCloud
        ? createTursoHttpAdapter(parsed.location)
        : createLocalSqliteAdapter(parsed.location),
      isInMemory: false
    };
  }
};
