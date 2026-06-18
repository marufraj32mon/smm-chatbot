/**
 * Groq SDK initializer.
 *
 * Free tier (no credit card required):
 *   - 14,400 requests/day
 *   - 6,000 tokens/minute
 *   - Ultra-fast responses (~0.5s)
 *   - Function calling support
 *   - No region restrictions (works globally, incl. Bangladesh)
 *
 * Get a free API key at: https://console.groq.com/keys
 *
 * Required env var:
 *   GROQ_API_KEY   your Groq API key (starts with gsk_...)
 *
 * Optional:
 *   GROQ_MODEL     defaults to "llama-3.3-70b-versatile" (free, excellent quality)
 *                  Other free options:
 *                    - "llama-3.1-8b-instant"  (faster, smaller)
 *                    - "llama-3.3-70b-versatile" (best quality)
 *                    - "gemma2-9b-it"           (Google's open model)
 */
import Groq from 'groq-sdk';

let cachedClient: Groq | null = null;

export function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys ' +
      'and add it as an environment variable in Vercel.'
    );
  }

  if (!cachedClient) {
    cachedClient = new Groq({ apiKey });
    console.log('[groq] Initialized Groq client');
  }

  return cachedClient;
}

// Default model — best free option on Groq
export const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
