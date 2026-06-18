import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

/**
 * GET /api/chatbot/init?key=PUBLIC_KEY
 *
 * Returns the public widget configuration that the embeddable script
 * needs to render itself: bot name, color, greeting, button shape, etc.
 *
 * If the public key does not exist, return a 404.
 * If no key is supplied, return 400.
 */
export async function GET(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) {
    return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
  }

  // Parse greeting suggestions safely
  let greetingSuggestions: string[] = [];
  try {
    greetingSuggestions = JSON.parse(widget.greetingSuggestions || '[]');
  } catch {}

  // CORS — widget is embedded on third-party sites
  const body = NextResponse.json({
    botName:              widget.botName,
    widgetColor:          widget.widgetColor,
    buttonShape:          widget.buttonShape,
    buttonIcon:           widget.buttonIcon,
    widgetIconUrl:        widget.widgetIconUrl || null,
    panelName:            widget.panelName,
    panelDomain:          widget.panelDomain,
    greetingMessage:      widget.greetingMessage,
    greetingSuggestions,
    greetingIntervalHours: widget.greetingIntervalHours,
    pusherKey:            null,
    pusherCluster:        null,
  });
  body.headers.set('Access-Control-Allow-Origin', '*');
  body.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return body;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

// Helper to mint a new session token (also used by /message when no token supplied)
export function newSessionToken(): string {
  return randomBytes(24).toString('hex');
}
