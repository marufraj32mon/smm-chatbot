import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/chatbot/history
 * Body: { sessionToken, publicKey }
 *
 * Returns:
 *   { messages: [{ role, content, agentName, createdAt }], mode, suggestions }
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionToken, publicKey } = body;
  if (!sessionToken || !publicKey) {
    return NextResponse.json({ error: 'Missing sessionToken or publicKey' }, { status: 400 });
  }

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Invalid key' }, { status: 404 });

  const session = await db.session.findUnique({
    where: { sessionToken },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 100 } },
  });
  if (!session || session.widgetId !== widget.id) {
    return NextResponse.json({ messages: [], mode: 'bot', suggestions: [] });
  }

  // Pull suggestions from the most recent bot message that has them
  const lastBotWithSuggestions = [...session.messages]
    .reverse()
    .find(m => m.role === 'bot' && m.suggestions);

  let suggestions: string[] = [];
  if (lastBotWithSuggestions?.suggestions) {
    try { suggestions = JSON.parse(lastBotWithSuggestions.suggestions); } catch {}
  }

  const res = NextResponse.json({
    messages: session.messages.map(m => ({
      id:        m.id,
      role:      m.role,
      content:   m.content,
      agentName: m.agentName,
      createdAt: m.createdAt,
    })),
    mode: session.mode,
    suggestions,
  });
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
