/**
 * 🇮🇳 Multi-Library Autonomous Agent: Live Postgres + Sarvam AI Translate + Twilio SMS via Liate
 * ZERO fake mocks — connects to real Postgres (DATABASE_URL), real Sarvam Translate API, and real Twilio REST API!
 */

import { liate, type ToolDefinition } from '../../../src/liate';
import { resilientFetch } from '../../../src/layers/llm/transport/fetch';

async function execLivePostgres(dbUrl: string, query: string, params: any[] = []): Promise<any[]> {
  if (!dbUrl) {
    throw new Error('Missing DATABASE_URL for live PostgreSQL queries.');
  }
  const parsed = new URL(dbUrl);
  if (parsed.hostname.includes('neon.tech')) {
    const res = await resilientFetch(`https://${parsed.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': dbUrl,
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
  if (!BunSQL) throw new Error('Native Bun.SQL is required.');
  const sql = new BunSQL(dbUrl);
  return await sql.unsafe(query, params);
}

/**
 * 1. Sarvam AI Official Client (Real https://api.sarvam.ai/translate)
 */
export class SarvamAIClient {
  private apiKey: string;
  public text: {
    translate: (args: { input: string; sourceLanguageCode: string; targetLanguageCode: string }) => Promise<any>;
  };

  constructor(options: { apiSubscriptionKey?: string } = {}) {
    this.apiKey = (options.apiSubscriptionKey || process.env.SARVAM_API_KEY || '').trim();
    this.text = {
      translate: async ({ input, sourceLanguageCode, targetLanguageCode }) => {
        if (!this.apiKey) {
          throw new Error('Missing SARVAM_API_KEY for live translation.');
        }
        const res = await fetch('https://api.sarvam.ai/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': this.apiKey,
          },
          body: JSON.stringify({
            input,
            source_language_code: sourceLanguageCode,
            target_language_code: targetLanguageCode,
            speaker_gender: 'Female',
            mode: 'formal',
            model: 'mayura:v1',
          }),
        });
        if (!res.ok) {
          throw new Error(`Sarvam Translate error (${res.status}): ${await res.text()}`);
        }
        return await res.json();
      },
    };
  }
}

/**
 * 2. Live PostgreSQL Onboarding Database Service (via Bun.SQL + DATABASE_URL)
 */
export class SupabaseDatabaseService {
  private initialized = false;
  private dbUrl: string;

  constructor(dbUrl: string = process.env.DATABASE_URL?.trim() || '') {
    this.dbUrl = dbUrl;
  }

  private async ensureSchema() {
    if (!this.initialized) {
      await execLivePostgres(
        this.dbUrl,
        `CREATE TABLE IF NOT EXISTS liate_onboarding_users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          language TEXT NOT NULL,
          city TEXT NOT NULL,
          welcomed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TEXT NOT NULL
        )`
      );
      this.initialized = true;
    }
  }

  async getNewUsersToday() {
    await this.ensureSchema();
    const users = await execLivePostgres(
      this.dbUrl,
      `SELECT id, name, phone, language, city, welcomed, created_at FROM liate_onboarding_users WHERE welcomed = FALSE ORDER BY created_at DESC LIMIT 20`
    );
    return {
      success: true,
      source: 'postgres-live',
      count: users.length,
      users,
    };
  }

  async markUserWelcomed(payload: { userId: string }) {
    await this.ensureSchema();
    const updated = await execLivePostgres(
      this.dbUrl,
      `UPDATE liate_onboarding_users SET welcomed = TRUE WHERE id = $1 RETURNING id, welcomed`,
      [payload.userId]
    );
    if (!updated || updated.length === 0) {
      return { success: false, error: `User '${payload.userId}' not found in liate_onboarding_users` };
    }
    return { success: true, source: 'postgres-live', userId: payload.userId, updatedStatus: 'WELCOMED' };
  }
}

/**
 * 3. Live Twilio Telecom SMS Gateway Service (Real Twilio REST API + Postgres Audit Log)
 */
export class TwilioSmsService {
  private dbUrl: string;
  private initialized = false;

  constructor(dbUrl: string = process.env.DATABASE_URL?.trim() || '') {
    this.dbUrl = dbUrl;
  }

  private async ensureSchema() {
    if (!this.initialized && this.dbUrl) {
      await execLivePostgres(
        this.dbUrl,
        `CREATE TABLE IF NOT EXISTS liate_sms_logs (
          message_sid TEXT PRIMARY KEY,
          recipient TEXT NOT NULL,
          body TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`
      );
      this.initialized = true;
    }
  }

  async sendSms(payload: { to: string; message: string; senderId?: string }) {
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const token = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = (payload.senderId || process.env.TWILIO_FROM_NUMBER || '').trim();
    if (!sid || !token || !from) {
      throw new Error('Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER for real SMS dispatch.');
    }

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const body = new URLSearchParams({ To: payload.to, From: from, Body: payload.message });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(`Twilio API error (${res.status}): ${await res.text()}`);
    }
    const data: any = await res.json();
    if (this.dbUrl) {
      await this.ensureSchema();
      await execLivePostgres(
        this.dbUrl,
        `INSERT INTO liate_sms_logs (message_sid, recipient, body, status, created_at) VALUES ($1, $2, $3, $4, $5)`,
        [data.sid, payload.to, payload.message, data.status || 'queued', new Date().toISOString()]
      );
    }
    return { success: true, messageId: data.sid, status: data.status, details: data };
  }

  async getMessageLogs() {
    await this.ensureSchema();
    const logs = await execLivePostgres(this.dbUrl, `SELECT * FROM liate_sms_logs ORDER BY created_at DESC LIMIT 20`);
    return { success: true, source: 'postgres-live', totalDispatched: logs.length, logs };
  }
}

/**
 * 🚀 WelcomeSmsAgent — Autonomous Multi-SDK Agent (class extends liate)
 */
export class WelcomeSmsAgent extends liate {
  public dbService: SupabaseDatabaseService;
  public sarvamClient: SarvamAIClient;
  public smsService: TwilioSmsService;

  L = 'sarvam/sarvam-105b';
  I = { memory: 'sessions/welcome-sms-session' };
  A = {
    name: 'welcome-sms-agent',
    intent: 'Autonomous Multilingual User Onboarding Agent. Chains live Postgres queries, real Sarvam Mayura translation, and real Twilio SMS.',
    maxSteps: 10,
  };
  E = {
    SARVAM_API_KEY: '$SARVAM_API_KEY',
    MAX_TURNS: '10',
  };
  T: Record<string, ToolDefinition>;

  constructor(apiKey: string = process.env.SARVAM_API_KEY || '') {
    super();
    this.dbService = new SupabaseDatabaseService();
    this.sarvamClient = new SarvamAIClient({ apiSubscriptionKey: apiKey });
    this.smsService = new TwilioSmsService();

    const db = this.dbService;
    const sms = this.smsService;
    const sarvam = this.sarvamClient;

    this.T = {
      db_getNewUsersToday: {
        description: 'Fetch newly registered users from live PostgreSQL liate_onboarding_users table',
        parameters: { type: 'object', properties: {} },
        execute: async () => JSON.stringify(await db.getNewUsersToday()),
      },
      db_markUserWelcomed: {
        description: 'Update user welcomed status in live PostgreSQL',
        parameters: {
          type: 'object',
          properties: { userId: { type: 'string' } },
          required: ['userId'],
        },
        execute: async (args) => JSON.stringify(await db.markUserWelcomed(args as any)),
      },
      sms_sendSms: {
        description: 'Send real SMS via Twilio REST API',
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            message: { type: 'string' },
            senderId: { type: 'string' },
          },
          required: ['to', 'message'],
        },
        execute: async (args) => JSON.stringify(await sms.sendSms(args as any)),
      },
      sms_getMessageLogs: {
        description: 'Query real dispatched SMS audit logs from PostgreSQL',
        parameters: { type: 'object', properties: {} },
        execute: async () => JSON.stringify(await sms.getMessageLogs()),
      },
      sarvam_text_translate: {
        description: 'Translate text to Indic regional language using live Sarvam AI Mayura API',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string' },
            source_language_code: { type: 'string' },
            target_language_code: { type: 'string' },
          },
          required: ['input', 'target_language_code'],
        },
        execute: async (args: any) => {
          const resp = await sarvam.text.translate({
            input: args.input,
            sourceLanguageCode: args.source_language_code || 'en-IN',
            targetLanguageCode: args.target_language_code,
          });
          return JSON.stringify(resp);
        },
      },
    };
  }

  async execute(toolName: string, args: Record<string, any> = {}): Promise<any> {
    const tool = this.T[toolName];
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    const res = await tool.execute(args);
    try {
      return JSON.parse(res);
    } catch {
      return res;
    }
  }

  getToolsList() {
    return Object.entries(this.T).map(([name, def]) => ({
      name,
      description: def.description,
    }));
  }
}
