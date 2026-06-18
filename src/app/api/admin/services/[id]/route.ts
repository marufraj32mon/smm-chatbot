import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PUT /api/admin/services/[id]?key=PUBLIC_KEY
 *   body: partial Service fields → updates a service.
 *
 * DELETE /api/admin/services/[id]?key=PUBLIC_KEY
 *   → Deletes a service.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  const { id } = await params;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Build update payload (only allow known fields)
  const allowed: any = {};
  const fields = ['externalId', 'name', 'platform', 'category', 'currency', 'avgTime', 'description', 'quality', 'isActive'];
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f];
  }
  if (body.rate     !== undefined) allowed.rate     = parseFloat(body.rate);
  if (body.minOrder !== undefined) allowed.minOrder = parseInt(body.minOrder, 10);
  if (body.maxOrder !== undefined) allowed.maxOrder = parseInt(body.maxOrder, 10);

  const updated = await db.service.update({
    where: { id },
    data: allowed,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  const { id } = await params;
  await db.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
