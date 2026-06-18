import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/services?key=PUBLIC_KEY
 *   → Returns all services for this widget.
 *
 * POST /api/admin/services?key=PUBLIC_KEY
 *   body: { name, platform, category, rate, ... }
 *   → Creates a new service.
 */
export async function GET(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  const services = await db.service.findMany({
    where: { widgetId: widget.id },
    orderBy: [{ platform: 'asc' }, { rate: 'asc' }],
  });
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate required fields
  const required = ['name', 'platform', 'category', 'rate'];
  for (const f of required) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      return NextResponse.json({ error: `Missing required field: ${f}` }, { status: 400 });
    }
  }

  const created = await db.service.create({
    data: {
      widgetId:    widget.id,
      externalId:  body.externalId  || null,
      name:        body.name,
      platform:    body.platform,
      category:    body.category,
      rate:        parseFloat(body.rate),
      currency:    body.currency    || 'USD',
      minOrder:    parseInt(body.minOrder, 10)    || 10,
      maxOrder:    parseInt(body.maxOrder, 10)    || 100000,
      avgTime:     body.avgTime     || '',
      description: body.description || '',
      quality:     body.quality     || 'standard',
      isActive:    body.isActive !== undefined ? Boolean(body.isActive) : true,
    },
  });
  return NextResponse.json(created);
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
