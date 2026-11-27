/**
 * 🗄️ SupabaseLibAgent — Real Live Postgres / Supabase DBA Agent
 * Powered by OpenLiate (class extends liate) — ZERO simulated mocks!
 */

import { randomBytes } from 'node:crypto';
import { liate, type ToolDefinition } from '../../../src/liate';
import { resilientFetch } from '../../../src/layers/llm/transport/fetch';

function assertIdentifier(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: '${name}'`);
  }
  return name;
}

export class RealSupabaseOperationsEngine {
  public url: string;
  public key: string;
  public dbUrl: string;

  constructor(
    url: string = process.env.SUPABASE_URL?.trim() || '',
    key: string = process.env.SUPABASE_SECRET_KEY?.trim() || '',
    dbUrl: string = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim() || ''
  ) {
    this.url = url.replace(/\/$/, '');
    this.key = key;
    this.dbUrl = dbUrl;
  }

  private hasSupabaseRest(): boolean {
    return Boolean(this.url && this.key && !this.key.includes('demo'));
  }

  private async runSql(query: string, params: any[] = []): Promise<any[]> {
    if (!this.dbUrl) {
      throw new Error('Missing SUPABASE_URL/SUPABASE_SECRET_KEY or DATABASE_URL for live database execution.');
    }
    const parsed = new URL(this.dbUrl);
    if (parsed.hostname.includes('neon.tech')) {
      const res = await resilientFetch(`https://${parsed.hostname}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Neon-Connection-String': this.dbUrl,
        },
        body: JSON.stringify({ query, params }),
      });
      if (!res.ok) {
        throw new Error(`Neon SQL HTTP error (${res.status}): ${await res.text()}`);
      }
      const data: any = await res.json();
      return data.rows || [];
    }
    const BunSQL = (globalThis as any).Bun?.SQL;
    if (!BunSQL) throw new Error('Native Bun.SQL is required for PostgreSQL.');
    const sql = new BunSQL(this.dbUrl);
    return await sql.unsafe(query, params);
  }

  async queryTable(payload: { table: string; select?: string; filterKey?: string; filterValue?: any; limit?: number }) {
    if (this.hasSupabaseRest()) {
      let endpoint = `${this.url}/rest/v1/${encodeURIComponent(payload.table)}?select=${encodeURIComponent(payload.select || '*')}`;
      if (payload.filterKey && payload.filterValue !== undefined) {
        endpoint += `&${encodeURIComponent(payload.filterKey)}=eq.${encodeURIComponent(payload.filterValue)}`;
      }
      if (payload.limit) {
        endpoint += `&limit=${Number(payload.limit)}`;
      }
      const res = await fetch(endpoint, {
        headers: { apikey: this.key, Authorization: `Bearer ${this.key}` },
      });
      if (!res.ok) {
        throw new Error(`Supabase REST error (${res.status}): ${await res.text()}`);
      }
      const rows = await res.json();
      return { success: true, source: 'supabase-rest', table: payload.table, count: rows.length, rows };
    }

    const table = assertIdentifier(payload.table);
    const cols = payload.select && payload.select !== '*'
      ? payload.select.split(',').map((c) => assertIdentifier(c.trim())).join(', ')
      : '*';
    const limit = Math.min(Math.max(Number(payload.limit || 20), 1), 100);

    let query = `SELECT ${cols} FROM "${table}"`;
    const params: any[] = [];
    if (payload.filterKey && payload.filterValue !== undefined) {
      const fk = assertIdentifier(payload.filterKey);
      query += ` WHERE "${fk}" = $1`;
      params.push(payload.filterValue);
    }
    query += ` LIMIT ${limit}`;

    const rows = await this.runSql(query, params);
    return { success: true, source: 'postgres-live', table, count: rows.length, rows };
  }

  async listAuthUsers(payload: { page?: number; perPage?: number } = {}) {
    if (this.hasSupabaseRest()) {
      const endpoint = `${this.url}/auth/v1/admin/users?page=${payload?.page || 1}&per_page=${payload?.perPage || 10}`;
      const res = await fetch(endpoint, {
        headers: { apikey: this.key, Authorization: `Bearer ${this.key}` },
      });
      if (!res.ok) {
        throw new Error(`Supabase Auth Admin error (${res.status}): ${await res.text()}`);
      }
      const data = await res.json();
      const users = data.users || [];
      return {
        success: true,
        source: 'supabase-auth',
        totalUsers: users.length,
        users: users.map((u: any) => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at })),
      };
    }

    const limit = Math.min(Math.max(Number(payload?.perPage || 10), 1), 100);
    const rows = await this.runSql(
      `SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_name LIMIT $1`,
      [limit]
    );
    return { success: true, source: 'postgres-live', tableCount: rows.length, tables: rows };
  }

  async getMarketplaceAgents(payload?: { visibility?: string }) {
    if (this.hasSupabaseRest()) {
      return this.queryTable({
        table: 'agents',
        filterKey: payload?.visibility ? 'visibility' : undefined,
        filterValue: payload?.visibility,
        limit: 20,
      });
    }
    const rows = await this.runSql(
      `SELECT current_database() AS database, current_user AS db_user, version() AS pg_version`
    );
    return { success: true, source: 'postgres-live', info: rows[0] };
  }

  async listStorageBuckets() {
    if (!this.hasSupabaseRest()) {
      throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required to list Supabase Storage buckets.');
    }
    const res = await fetch(`${this.url}/storage/v1/bucket`, {
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}` },
    });
    if (!res.ok) {
      throw new Error(`Supabase Storage error (${res.status}): ${await res.text()}`);
    }
    const buckets = await res.json();
    return { success: true, source: 'supabase-storage', bucketCount: buckets.length, buckets };
  }

  async createDeveloperSession(payload: { email: string; tier?: string }) {
    await this.runSql(`
      CREATE TABLE IF NOT EXISTS liate_dev_sessions (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        tier TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    const id = `dev_${randomBytes(8).toString('hex')}`;
    const createdAt = new Date().toISOString();
    await this.runSql(
      `INSERT INTO liate_dev_sessions (id, email, tier, created_at) VALUES ($1, $2, $3, $4)`,
      [id, payload.email, payload.tier || 'pro', createdAt]
    );
    return {
      success: true,
      source: 'postgres-live',
      sessionId: id,
      email: payload.email,
      tier: payload.tier || 'pro',
      createdAt,
    };
  }
}

export class SupabaseLibAgent extends liate {
  public opsEngine: RealSupabaseOperationsEngine;

  L = 'sarvam/sarvam-105b';
  I = { memory: 'sessions/supabase-live-session' };
  A = {
    name: 'supabase-dba-agent',
    intent: 'Autonomous Live Postgres & Supabase DBA Agent. Never fabricates data; executes real database queries.',
    maxSteps: 10,
  };
  E = {
    MAX_TURNS: '10',
  };
  T: Record<string, ToolDefinition>;

  constructor(
    supabaseUrl: string = process.env.SUPABASE_URL || '',
    supabaseKey: string = process.env.SUPABASE_SECRET_KEY || '',
    dbUrl: string = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || ''
  ) {
    super();
    this.opsEngine = new RealSupabaseOperationsEngine(supabaseUrl, supabaseKey, dbUrl);
    const ops = this.opsEngine;

    this.T = {
      supabase_queryTable: {
        description: 'Query records from live Postgres/Supabase table with filter and limit',
        parameters: {
          type: 'object',
          properties: {
            table: { type: 'string' },
            select: { type: 'string' },
            filterKey: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['table'],
        },
        execute: async (args: any) => JSON.stringify(await ops.queryTable(args)),
      },
      supabase_listAuthUsers: {
        description: 'List live Supabase Auth users or live PostgreSQL public tables',
        parameters: {
          type: 'object',
          properties: { page: { type: 'number' }, perPage: { type: 'number' } },
        },
        execute: async (args: any) => JSON.stringify(await ops.listAuthUsers(args)),
      },
      supabase_getMarketplaceAgents: {
        description: 'Inspect live database instance metadata or agents table',
        parameters: { type: 'object', properties: { visibility: { type: 'string' } } },
        execute: async (args: any) => JSON.stringify(await ops.getMarketplaceAgents(args)),
      },
      supabase_listStorageBuckets: {
        description: 'List Supabase Storage Buckets via live Storage API',
        parameters: { type: 'object', properties: {} },
        execute: async () => JSON.stringify(await ops.listStorageBuckets()),
      },
      supabase_createDeveloperSession: {
        description: 'Persist a real developer session record in live PostgreSQL',
        parameters: {
          type: 'object',
          properties: { email: { type: 'string' }, tier: { type: 'string' } },
          required: ['email'],
        },
        execute: async (args: any) => JSON.stringify(await ops.createDeveloperSession(args)),
      },
    };
  }

  async execute(toolName: string, args: Record<string, any> = {}): Promise<any> {
    const tool = this.T[toolName];
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    return await tool.execute(args);
  }

  getToolsList() {
    return Object.entries(this.T).map(([name, def]) => ({
      name,
      description: def.description,
    }));
  }
}
