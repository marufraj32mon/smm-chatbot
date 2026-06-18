/**
 * MothersSMM Admin API v2 — typed client
 *
 * Base URL: https://mothersmm.com/adminapi/v2
 * Auth: X-Api-Key header
 * Rate limit: 5 req/sec per panel
 *
 * All 22 endpoints documented in the OpenAPI spec are implemented here.
 * The AI chatbot uses these to answer questions about orders, services,
 * payments, users, and tickets.
 */

export interface SmmConfig {
  apiBase: string;   // e.g. https://mothersmm.com/adminapi/v2
  apiKey:  string;   // X-Api-Key value (Admin API key — also used for user API services endpoint)
  panelDomain?: string;  // e.g. https://mothersmm.com — derived from apiBase if not set
}

export class SmmApiError extends Error {
  status: number;
  body:   unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body   = body;
  }
}

async function smmFetch<T = any>(
  cfg: SmmConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!cfg.apiKey) throw new SmmApiError('Missing SMM API key', 401);
  const url = cfg.apiBase.replace(/\/+$/, '') + path;
  const res = await fetch(url, {
    ...init,
    headers: {
      'X-Api-Key': cfg.apiKey,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  // 429 rate-limit — surface as a typed error so the LLM can fall back gracefully
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    throw new SmmApiError('Rate limited by SMM API (429)', 429, body);
  }

  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new SmmApiError(
      json?.message || json?.error || `SMM API ${res.status}`,
      res.status,
      json,
    );
  }
  return json as T;
}

// ─── Types (subset, only what we commonly read) ────────────────────────
export interface SmmOrder {
  id:           number | string;
  service_id?:  number | string;
  link?:        string;
  quantity?:    number;
  charge?:      number | string;
  start_count?: number;
  remains?:     number;
  status?:      string; // Pending | Processing | In progress | Completed | Partial | Canceled | Refunded
  created_at?:  string | number;
  updated_at?:  string | number;
  [k: string]:  any;
}

export interface SmmUser {
  id?:         number | string;
  username?:   string;
  email?:      string;
  balance?:    number | string;
  spending?:   number | string;
  created_at?: string | number;
  [k: string]: any;
}

export interface SmmPayment {
  id?:         number | string;
  user_id?:    number | string;
  amount?:     number | string;
  method?:     string;
  status?:     string;
  created_at?: string | number;
  [k: string]: any;
}

export interface SmmTicket {
  id?:         number | string;
  subject?:    string;
  status?:     string; // Open | Answered | Closed
  created_at?: string | number;
  [k: string]: any;
}

// ─── Orders ─────────────────────────────────────────────────────────────
export const orders = {
  /** POST /orders/pull — pull pending orders for manual services */
  pull: (cfg: SmmConfig, opts?: { service_ids?: string; limit?: number }) =>
    smmFetch(cfg, '/orders/pull', {
      method: 'POST',
      body: JSON.stringify({
        service_ids: opts?.service_ids,
        limit:       opts?.limit ?? 100,
      }),
    }),

  /** GET /orders — list orders (paginated) */
  list: (cfg: SmmConfig, params: { offset?: number; limit?: number; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.offset) q.set('offset', String(params.offset));
    if (params.limit)  q.set('limit',  String(params.limit));
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return smmFetch(cfg, '/orders' + (qs ? '?' + qs : ''));
  },

  /** GET /orders/{order_id} — single order detail */
  get: (cfg: SmmConfig, orderId: string | number) =>
    smmFetch(cfg, `/orders/${orderId}`),

  /** POST /orders/update — update order status */
  update: (cfg: SmmConfig, body: { order_id: string | number; status: string; [k: string]: any }) =>
    smmFetch(cfg, '/orders/update', { method: 'POST', body: JSON.stringify(body) }),

  /** POST /orders/{order_id}/edit-link */
  editLink: (cfg: SmmConfig, orderId: string | number, link: string) =>
    smmFetch(cfg, `/orders/${orderId}/edit-link`, {
      method: 'POST',
      body: JSON.stringify({ link }),
    }),

  /** POST /orders/resend */
  resend: (cfg: SmmConfig, orderId: string | number) =>
    smmFetch(cfg, '/orders/resend', { method: 'POST', body: JSON.stringify({ order_id: orderId }) }),

  /** POST /orders/change-status */
  changeStatus: (cfg: SmmConfig, body: { order_id: string | number; status: string }) =>
    smmFetch(cfg, '/orders/change-status', { method: 'POST', body: JSON.stringify(body) }),

  /** POST /orders/{order_id}/set-partial */
  setPartial: (cfg: SmmConfig, orderId: string | number, start_count: number, remains: number) =>
    smmFetch(cfg, `/orders/${orderId}/set-partial`, {
      method: 'POST',
      body: JSON.stringify({ start_count, remains }),
    }),

  /** POST /orders/request-cancel */
  requestCancel: (cfg: SmmConfig, orderId: string | number) =>
    smmFetch(cfg, '/orders/request-cancel', { method: 'POST', body: JSON.stringify({ order_id: orderId }) }),

  /** POST /orders/cancel — cancel and refund */
  cancelAndRefund: (cfg: SmmConfig, orderId: string | number) =>
    smmFetch(cfg, '/orders/cancel', { method: 'POST', body: JSON.stringify({ order_id: orderId }) }),
};

// ─── Cancel tasks ──────────────────────────────────────────────────────
export const cancel = {
  pull:   (cfg: SmmConfig, opts?: { limit?: number }) =>
    smmFetch(cfg, '/cancel/pull', { method: 'POST', body: JSON.stringify({ limit: opts?.limit ?? 100 }) }),
  reject: (cfg: SmmConfig, orderId: string | number) =>
    smmFetch(cfg, '/cancel/reject', { method: 'POST', body: JSON.stringify({ order_id: orderId }) }),
};

// ─── Refill tasks ──────────────────────────────────────────────────────
export const refill = {
  pull: (cfg: SmmConfig, opts?: { limit?: number }) =>
    smmFetch(cfg, '/refill/pull', { method: 'POST', body: JSON.stringify({ limit: opts?.limit ?? 100 }) }),
  changeStatus: (cfg: SmmConfig, body: { refill_id: string | number; status: string }) =>
    smmFetch(cfg, '/refill/change-status', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Payments ──────────────────────────────────────────────────────────
export const payments = {
  list: (cfg: SmmConfig, params: { offset?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.offset) q.set('offset', String(params.offset));
    if (params.limit)  q.set('limit',  String(params.limit));
    const qs = q.toString();
    return smmFetch(cfg, '/payments' + (qs ? '?' + qs : ''));
  },
  add: (cfg: SmmConfig, body: { user_id: string | number; amount: number | string; method?: string }) =>
    smmFetch(cfg, '/payments/add', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Users ─────────────────────────────────────────────────────────────
export const users = {
  add: (cfg: SmmConfig, body: { username: string; email: string; password: string; [k: string]: any }) =>
    smmFetch(cfg, '/users/add', { method: 'POST', body: JSON.stringify(body) }),
  list: (cfg: SmmConfig, params: { offset?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.offset) q.set('offset', String(params.offset));
    if (params.limit)  q.set('limit',  String(params.limit));
    const qs = q.toString();
    return smmFetch(cfg, '/users' + (qs ? '?' + qs : ''));
  },
};

// ─── Tickets ───────────────────────────────────────────────────────────
export const tickets = {
  list: (cfg: SmmConfig, params: { offset?: number; limit?: number; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.offset) q.set('offset', String(params.offset));
    if (params.limit)  q.set('limit',  String(params.limit));
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return smmFetch(cfg, '/tickets' + (qs ? '?' + qs : ''));
  },
  get: (cfg: SmmConfig, ticketId: string | number) =>
    smmFetch(cfg, `/tickets/${ticketId}`),
  reply: (cfg: SmmConfig, body: { ticket_id: string | number; message: string; [k: string]: any }) =>
    smmFetch(cfg, `/tickets/${body.ticket_id}/reply`, { method: 'POST', body: JSON.stringify(body) }),
  add: (cfg: SmmConfig, body: { subject: string; message: string; [k: string]: any }) =>
    smmFetch(cfg, '/tickets/add', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Services (Standard SMM Panel User API) ────────────────────────────
//
// Most SMM panels (Perfect Panel, SMMRaze, MothersSMM, etc.) expose a
// universal user API at GET /api/v2?key=KEY&action=services that returns
// the full service catalog with rates. The Admin API v2 doesn't expose
// services — so we use the user API endpoint to fetch them.
//
// The apiBase in SmmConfig points to the Admin API root (e.g.
// https://mothersmm.com/adminapi/v2). We derive the panel domain from it
// and hit `<panelDomain>/api/v2`.
export const services = {
  /**
   * List ALL services from the SMM panel.
   *
   * @param cfg     SmmConfig (apiBase + apiKey)
   * @param filters Optional filters: platform (e.g. "Facebook"), category (e.g. "Followers"), limit
   * @returns Filtered + sorted (cheapest first) services from the panel
   */
  list: async (
    cfg: SmmConfig,
    filters?: { platform?: string; category?: string; limit?: number },
  ): Promise<{ ok: true; count: number; services: any[] } | { ok: false; error: string }> => {
    try {
      // Derive the panel domain from apiBase
      // e.g. https://mothersmm.com/adminapi/v2 → https://mothersmm.com
      let panelDomain = cfg.panelDomain || '';
      if (!panelDomain) {
        try {
          const u = new URL(cfg.apiBase);
          panelDomain = `${u.protocol}//${u.host}`;
        } catch {
          return { ok: false, error: 'Invalid apiBase in SmmConfig' };
        }
      }

      // Hit the standard SMM user API endpoint
      const url = `${panelDomain.replace(/\/+$/, '')}/api/v2?key=${encodeURIComponent(cfg.apiKey)}&action=services`;
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch {
        return { ok: false, error: `Panel API returned non-JSON: ${text.slice(0, 200)}` };
      }

      if (!res.ok) {
        const errMsg = json?.error || json?.message || `Panel API ${res.status}`;
        return { ok: false, error: errMsg };
      }

      if (!Array.isArray(json)) {
        return { ok: false, error: 'Panel API did not return a services array' };
      }

      // Normalize each service: parse rate/min/max to numbers, extract platform+category
      let normalized = json.map((s: any) => {
        const rate = parseFloat(s.rate) || 0;
        const min  = parseInt(s.min, 10)  || 0;
        const max  = parseInt(s.max, 10)  || 0;

        // The "category" field from SMM panels often looks like "Instagram" or
        // "Social Media → Instagram → Followers". We split it to extract platform + category.
        const categoryStr = String(s.category || '');
        const parts = categoryStr.split(/[→\->]/).map((p: string) => p.trim()).filter(Boolean);
        const platform = parts.length > 1 ? parts[parts.length - 2] : (parts[0] || '');
        const category = parts.length > 1 ? parts[parts.length - 1] : '';

        return {
          service_id:  s.service,
          name:        s.name,
          category:    categoryStr,
          platform:    platform,
          serviceType: category,
          rate,
          ratePer1000: rate,
          min,
          max,
          type:        s.type,
          description: s.desc || s.description || '',
          dripfeed:    Boolean(s.dripfeed),
          refill:      Boolean(s.refill),
          cancel:      Boolean(s.cancel),
        };
      });

      // Apply filters
      if (filters?.platform) {
        const p = filters.platform.toLowerCase();
        normalized = normalized.filter((s: any) =>
          s.platform?.toLowerCase().includes(p) ||
          s.category?.toLowerCase().includes(p) ||
          s.name?.toLowerCase().includes(p),
        );
      }
      if (filters?.category) {
        const c = filters.category.toLowerCase();
        normalized = normalized.filter((s: any) =>
          s.serviceType?.toLowerCase().includes(c) ||
          s.category?.toLowerCase().includes(c) ||
          s.name?.toLowerCase().includes(c),
        );
      }

      // Sort cheapest first
      normalized.sort((a: any, b: any) => a.rate - b.rate);

      // Apply limit
      const limit = filters?.limit ?? 10;
      if (limit > 0) normalized = normalized.slice(0, limit);

      return { ok: true, count: normalized.length, services: normalized };
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) };
    }
  },
};

// ─── Top-level client ──────────────────────────────────────────────────
export function createSmmClient(cfg: SmmConfig) {
  return { services, orders, cancel, refill, payments, users, tickets };
}

// ─── Helper: safe call that never throws — used by AI tool wrappers ───
export async function safe<T>(p: Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await p;
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
