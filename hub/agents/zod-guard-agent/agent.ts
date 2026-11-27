/**
 * 🛡️ ZodLibAgent — Production Schema Validation & Data Guard Agent powered by Zod via LiateImport
 * Dynamically synthesizes Zod validation rules & schemas into executable agent tools!
 */

import { z } from 'zod';
import { liate, type ToolDefinition } from '../../../src/liate';

/**
 * Enterprise Schema Toolkit powered by Zod
 */
export class ZodSchemaEngine {
  // Pre-configured Zod Schemas
  private userSignupSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(20),
    email: z.string().email('Invalid email address format'),
    age: z.number().int().min(18, 'Must be at least 18 years old').max(120),
    role: z.enum(['admin', 'developer', 'viewer']).default('developer'),
    phoneNumber: z.string().regex(/^\+91[6-9]\d{9}$/, 'Must be a valid Indian (+91) phone number').optional(),
  });

  private paymentTransactionSchema = z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    currency: z.enum(['INR', 'USD', 'EUR']).default('INR'),
    merchantId: z.string().min(5),
    customerId: z.string().email(),
    idempotencyKey: z.string().uuid('Idempotency key must be a valid UUIDv4'),
  });

  /**
   * Helper to normalize payload from direct object or wrapped { payload: ... }
   */
  private normalizePayload(raw: any): any {
    if (raw && typeof raw === 'object' && 'payload' in raw && Object.keys(raw).length === 1) {
      return typeof raw.payload === 'string' ? JSON.parse(raw.payload) : raw.payload;
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  }

  /**
   * Validate user registration payload against Zod strict rules
   */
  validateUserSignup(payload: any) {
    const data = this.normalizePayload(payload);
    const result = this.userSignupSchema.safeParse(data);
    if (!result.success) {
      const issues = result.error?.issues || (result.error as any)?.errors || [];
      return {
        isValid: false,
        status: 'REJECTED',
        errorCount: issues.length,
        errors: issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      };
    }
    return {
      isValid: true,
      status: 'APPROVED',
      sanitizedData: result.data,
    };
  }

  /**
   * Validate high-stakes payment payload with Zod
   */
  validatePayment(payload: any) {
    const data = this.normalizePayload(payload);
    const result = this.paymentTransactionSchema.safeParse(data);
    if (!result.success) {
      const issues = result.error?.issues || (result.error as any)?.errors || [];
      return {
        isValid: false,
        status: 'PAYMENT_PAYLOAD_INVALID',
        errorCount: issues.length,
        errors: issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      };
    }
    return {
      isValid: true,
      status: 'PAYMENT_PAYLOAD_VERIFIED',
      sanitizedData: result.data,
    };
  }

  /**
   * Validate email format and check for disposable domains
   */
  validateEmail(payload: any) {
    const data = this.normalizePayload(payload);
    const emailStr = typeof data === 'string' ? data : (data?.email || '');
    const emailSchema = z.string().email();
    const parsed = emailSchema.safeParse(emailStr);
    if (!parsed.success) {
      return { isValid: false, reason: 'Malformed email syntax' };
    }
    const disposableDomains = ['tempmail.com', 'throwaway.email', 'mailinator.com'];
    const domain = emailStr.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) {
      return { isValid: false, reason: 'Disposable / spam email domain detected', domain };
    }
    return { isValid: true, email: parsed.data, domain };
  }
}

const schemaEngine = new ZodSchemaEngine();

export class ZodLibAgent extends liate {
  public schemaEngine: ZodSchemaEngine = schemaEngine;

  L = 'sarvam/sarvam-105b';
  I = { memory: 'sessions/zod-validation-session' };
  A = {
    name: 'zod-guard-agent',
    intent: 'Autonomous Schema Integrity & Data Validation Guard Agent powered by Zod via Liate L·I·A·T·E.',
    maxSteps: 5,
  };
  T: Record<string, ToolDefinition> = {
    validator_validateUserSignup: {
      description: 'Validate user registration payload against Zod strict rules',
      parameters: { type: 'object', properties: { payload: { type: 'object' } }, required: ['payload'] },
      execute: async (args) => JSON.stringify(schemaEngine.validateUserSignup(args.payload ?? args)),
    },
    validator_validatePayment: {
      description: 'Validate high-stakes payment payload with Zod',
      parameters: { type: 'object', properties: { payload: { type: 'object' } }, required: ['payload'] },
      execute: async (args) => JSON.stringify(schemaEngine.validatePayment(args.payload ?? args)),
    },
    validator_validateEmail: {
      description: 'Validate email format and check for disposable domains',
      parameters: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
      execute: async (args) => JSON.stringify(schemaEngine.validateEmail(args.email ?? args)),
    },
  };
  E = { SARVAM_API_KEY: '$SARVAM_API_KEY', MAX_TURNS: '5' };
}
