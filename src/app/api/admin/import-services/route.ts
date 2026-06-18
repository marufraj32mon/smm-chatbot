import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { services as smmServices } from '@/lib/smm-api';

/**
 * POST /api/admin/import-services?key=PUBLIC_KEY
 *
 * Fetches ALL services from the SMM panel's user API (/api/v2?action=services)
 * and imports them into the local Service table. Existing services with the
 * same externalId are updated; new ones are inserted.
 *
 * This is optional — the chatbot calls the SMM panel API directly for live
 * pricing. But populating the local table gives the bot a fallback when the
 * panel API is rate-limited.
 */
export async function POST(req: NextRequest) {
  const publicKey = req.nextUrl.searchParams.get('key');
  if (!publicKey) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) return NextResponse.json({ error: 'Widget not found' }, { status: 404 });

  if (!widget.smmApiKey) {
    return NextResponse.json(
      { error: 'SMM API key is not set. Add it in the SMM API tab first.' },
      { status: 400 },
    );
  }

  // Fetch live services from SMM panel
  const result = await smmServices.list({
    apiBase: widget.smmApiBase,
    apiKey:  widget.smmApiKey,
  }, { limit: 0 });  // 0 = no limit, fetch all

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch services from panel: ' + result.error },
      { status: 502 },
    );
  }

  const panelServices = result.services;
  let inserted = 0;
  let updated  = 0;
  let skipped  = 0;

  for (const s of panelServices) {
    if (!s.service_id || !s.name) {
      skipped++;
      continue;
    }

    const externalId = String(s.service_id);

    // Try to find existing service by externalId
    const existing = await db.service.findFirst({
      where: { widgetId: widget.id, externalId },
    });

    const data = {
      name:        s.name,
      platform:    s.platform || 'Unknown',
      category:    s.serviceType || s.category || 'Other',
      rate:        s.rate,
      minOrder:    s.min,
      maxOrder:    s.max,
      description: s.description || '',
      avgTime:     '',
      quality:     'standard',
      isActive:    true,
    };

    if (existing) {
      await db.service.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await db.service.create({
        data: { ...data, widgetId: widget.id, externalId },
      });
      inserted++;
    }
  }

  return NextResponse.json({
    ok: true,
    total:    panelServices.length,
    inserted,
    updated,
    skipped,
  });
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
