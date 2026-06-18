import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/sessions?key=PUBLIC_KEY
 *   → Returns recent sessions for the widget.
 *
 * DELETE /api/admin/sessions?key=PUBLIC_KEY
 *   → Wipes all sessions + messages for the widget.
 */
export async function GET(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  const sessions = await db.session.findMany({
    where:  { widgetId: widget.id },
    orderBy: { createdAt: 'desc' },
    take:    100,
    include: { _count: { select: { messages: true } } },
  });

  return NextResponse.json({ sessions });
}

export async function DELETE(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  // Cascade deletes will handle messages
  await db.session.deleteMany({ where: { widgetId: widget.id } });
  return NextResponse.json({ ok: true });
}
