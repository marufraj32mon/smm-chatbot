import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/widget?key=PUBLIC_KEY
 *   → Returns the FULL widget config (including secretKey, smmApiKey) for admin UI.
 *
 * PUT /api/admin/widget?key=PUBLIC_KEY
 *   body: WidgetConfig (partial)
 *   → Updates the widget.
 *
 * NOTE: This is a demo admin endpoint. In production, gate it behind real
 * authentication (NextAuth, session cookie, IP allowlist, etc.).
 */
export async function GET(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  return NextResponse.json(widget);
}

export async function PUT(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist updatable fields (never let the client change id / publicKey / secretKey)
  const allowed: Record<string, any> = {};
  const fields = [
    'panelName', 'panelDomain', 'botName', 'widgetColor', 'buttonShape', 'buttonIcon',
    'widgetIconUrl', 'greetingMessage', 'greetingSuggestions', 'greetingIntervalHours',
    'smmApiBase', 'smmApiKey', 'systemPromptExtra',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f];
  }

  // Validate JSON suggestions
  if (allowed.greetingSuggestions !== undefined) {
    try {
      const arr = JSON.parse(allowed.greetingSuggestions);
      if (!Array.isArray(arr)) throw new Error('greetingSuggestions must be a JSON array');
    } catch (e: any) {
      return NextResponse.json({ error: 'greetingSuggestions must be valid JSON: ' + e.message }, { status: 400 });
    }
  }

  const updated = await db.widget.update({
    where: { id: widget.id },
    data: allowed,
  });
  return NextResponse.json(updated);
}
