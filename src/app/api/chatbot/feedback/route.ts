import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/chatbot/feedback
 * Body: { sessionToken, publicKey, messageId, rating: 'up'|'down', comment? }
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionToken, publicKey, messageId, rating, comment } = body;
  if (!sessionToken || !publicKey || !messageId || !rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (rating !== 'up' && rating !== 'down') {
    return NextResponse.json({ error: 'rating must be up or down' }, { status: 400 });
  }

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Invalid key' }, { status: 404 });

  const session = await db.session.findUnique({ where: { sessionToken } });
  if (!session || session.widgetId !== widget.id) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 404 });
  }

  const fb = await db.feedback.create({
    data: {
      widgetId:  widget.id,
      sessionId: session.id,
      messageId,
      rating,
      comment:   comment || null,
    },
  });

  const res = NextResponse.json({ ok: true, id: fb.id });
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
