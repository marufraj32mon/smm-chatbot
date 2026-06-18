/**
 * Google Gemini SDK initializer.
 *
 * Free tier (no credit card required):
 *   - 1500 requests/day
 *   - 1 million tokens per minute
 *   - Supports function calling, multilingual (incl. Bengali)
 *
 * Get a free API key at: https://aistudio.google.com/apikey
 *
 * Required env var:
 *   GEMINI_API_KEY   your Gemini API key (starts with AIza...)
 *
 * Optional:
 *   GEMINI_MODEL     defaults to "gemini-2.0-flash" (free tier, current)
 *                    Other free options: "gemini-2.0-flash-lite", "gemini-2.5-flash"
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

let cachedClient: GoogleGenerativeAI | null = null;
let cachedModel: any = null;

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey ' +
      'and add it as an environment variable in Vercel.'
    );
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
    // Default: gemini-2.0-flash — Google's current stable free-tier model.
    // gemini-1.5-* models are deprecated and return 404.
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    cachedModel = cachedClient.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
      },
    });
    console.log('[gemini] Initialized model:', modelName);
  }

  return { client: cachedClient, model: cachedModel };
}
