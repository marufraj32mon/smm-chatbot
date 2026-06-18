import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/chatbot/suggestions?key=PUBLIC_KEY&lang=en
 *
 * Returns the greeting-time suggestion chips for the widget.
 * (We simply serve the per-widget greetingSuggestions for now.)
 */
export async function GET(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  let suggestions: string[] = [];
  try { suggestions = JSON.parse(widget.greetingSuggestions || '[]'); } catch {}

  const res = NextResponse.json({
    suggestions: suggestions.map(s => ({ text: s })),
  });
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
