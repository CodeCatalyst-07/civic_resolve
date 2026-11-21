import { z } from 'zod';

/**
 * Zod schema for environment configuration with strict validation and provider-specific refinements.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    AI_PROVIDER: z.enum(['jarvis', 'gemini', 'mock']).default('mock'),
    JARVISLABS_API_KEY: z.string().optional(),
    JARVIS_BASE_URL: z.string().url().default('https://models.jarvislabs.net/v1'),
    JARVIS_MODEL: z.string().min(1).default('gemma-4-31b-it'),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
    REPO_DRIVER: z.enum(['memory', 'firestore']).default('memory'),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
    GOOGLE_MAPS_SERVER_KEY: z.string().optional(),
    AI_DAILY_BUDGET: z.coerce.number().int().positive().default(200),
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    AI_TOTAL_DEADLINE_MS: z.coerce.number().int().positive().default(20000),
    AI_MAX_TOKENS: z.coerce.number().int().positive().default(1000),
    AI_DISABLE_THINKING: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((val) => (typeof val === 'boolean' ? val : val === 'true'))
      .default(true),
    AI_CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(200),
    AI_CACHE_TTL_MS: z.coerce.number().int().positive().default(3600000),
    GEOCODE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    ALLOWED_ORIGINS: z.string().optional().default(''),
    DEMO_AUTHORITY_CODE: z.string().optional(),
    AUTO_SEED: z.enum(['true', 'false']).default('true'),
  })
  .superRefine((data, ctx) => {
    if (data.AI_PROVIDER === 'jarvis') {
      if (!data.JARVISLABS_API_KEY || data.JARVISLABS_API_KEY.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JARVISLABS_API_KEY'],
          message: 'JARVISLABS_API_KEY is required when AI_PROVIDER is "jarvis"',
        });
      }
    }

    if (data.AI_PROVIDER === 'gemini') {
      if (!data.GEMINI_API_KEY || data.GEMINI_API_KEY.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GEMINI_API_KEY'],
          message: 'GEMINI_API_KEY is required when AI_PROVIDER is "gemini"',
        });
      }
      if (!data.GEMINI_MODEL || data.GEMINI_MODEL.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GEMINI_MODEL'],
          message: 'GEMINI_MODEL is required when AI_PROVIDER is "gemini" (e.g. "gemini-3.5-flash-lite")',
        });
      }
    }

    if (data.REPO_DRIVER === 'firestore') {
      if (!data.FIREBASE_SERVICE_ACCOUNT_JSON || data.FIREBASE_SERVICE_ACCOUNT_JSON.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FIREBASE_SERVICE_ACCOUNT_JSON'],
          message: 'FIREBASE_SERVICE_ACCOUNT_JSON is required when REPO_DRIVER is "firestore"',
        });
      }
    }
  });

export type Config = Readonly<z.infer<typeof envSchema>>;

/**
 * Loads, parses, and validates environment variables.
 *
 * @param env - Environment variables record (defaults to process.env)
 * @returns Frozen, strongly-typed configuration object
 * @throws Error detailing missing or invalid variables without revealing secret values
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => {
        const fieldName = issue.path.join('.') || 'configuration';
        return `  - ${fieldName}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(
      `CivicResolve Configuration Error: Missing or invalid environment variables:\n${errorDetails}\n(Check .env.example for required configuration)`
    );
  }

  return Object.freeze(result.data);
}
