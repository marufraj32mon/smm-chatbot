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
 *   GEMINI_MODEL     defaults to "gemini-1.5-flash" (free tier)
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
    cachedModel = cachedClient.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
      },
    });
    console.log('[gemini] Initialized model:', process.env.GEMINI_MODEL || 'gemini-1.5-flash');
  }

  return { client: cachedClient, model: cachedModel };
}
