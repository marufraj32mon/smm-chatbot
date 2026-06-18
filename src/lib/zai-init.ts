/**
 * ZAI SDK initializer that supports BOTH:
 *   1. Environment variables (preferred — for Vercel / serverless)
 *   2. .z-ai-config file (fallback — for local dev / sandbox)
 *
 * Required env vars when running on Vercel/production:
 *   ZAI_BASE_URL   e.g. https://api.z.ai/api/v1
 *   ZAI_API_KEY    your ZAI API key (from https://z.ai)
 *   ZAI_TOKEN      (optional) bearer token
 *   ZAI_CHAT_ID    (optional)
 *   ZAI_USER_ID    (optional)
 *
 * If env vars are missing, falls back to ZAI.create() which reads .z-ai-config.
 */
import ZAI from 'z-ai-web-dev-sdk';

export interface ZaiConfig {
  baseUrl: string;
  apiKey:  string;
  token?:  string;
  chatId?: string;
  userId?: string;
}

let cached: any = null;

export async function getZai() {
  if (cached) return cached;

  // 1. Try environment variables first (Vercel production)
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey  = process.env.ZAI_API_KEY;
  if (baseUrl && apiKey) {
    const cfg: ZaiConfig = {
      baseUrl,
      apiKey,
      token:  process.env.ZAI_TOKEN,
      chatId: process.env.ZAI_CHAT_ID,
      userId: process.env.ZAI_USER_ID,
    };
    console.log('[zai] Using config from environment variables');
    // The ZAI class constructor accepts a config object directly.
    // We cast to any because TS types only expose the static create() method.
    cached = new (ZAI as any)(cfg);
    return cached;
  }

  // 2. Fall back to .z-ai-config file (local dev / sandbox)
  console.log('[zai] Env vars not set, falling back to .z-ai-config file');
  cached = await ZAI.create();
  return cached;
}
