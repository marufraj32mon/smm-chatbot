import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { runChat } from '@/lib/chatbot-core';
import { newSessionToken } from '../init/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/chatbot/message
 *
 * Body: { message, sessionToken?, publicKey }
 *
 * Streams SSE events back:
 *   data: {"type":"step","text":"...","status":"active"}
 *   data: {"type":"done","reply":"...","messageId":"...","suggestions":["..."],"mode":"bot"}
 *   data: {"type":"error","message":"..."}
 *
 * The widget understands this protocol.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message, sessionToken, publicKey } = body as {
    message?: string; sessionToken?: string; publicKey?: string;
  };

  if (!message || !publicKey) {
    return new Response(JSON.stringify({ error: 'Missing message or publicKey' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const widget = await db.widget.findUnique({ where: { publicKey } });
  if (!widget) {
    return new Response(JSON.stringify({ error: 'Invalid public key' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Resolve or create session ────────────────────────────────────
  let session = sessionToken
    ? await db.session.findUnique({ where: { sessionToken } })
    : null;

  if (!session) {
    session = await db.session.create({
      data: {
        widgetId:     widget.id,
        sessionToken: newSessionToken(),
        mode:         'bot',
        userAgent:    req.headers.get('user-agent')?.slice(0, 250) || null,
        ip:           (req.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 50) || null,
        lang:         (req.headers.get('accept-language') || 'en').slice(0, 5),
      },
    });
  }

  // Persist the user message
  await db.message.create({
    data: {
      widgetId:  widget.id,
      sessionId: session.id,
      role:      'user',
      content:   message,
    },
  });

  // ─── Build conversation history (last 12 messages) ────────────────
  const recent = await db.message.findMany({
    where:  { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
    take:   24,
  });
  // Build history in OpenAI/Groq format (roles: 'user' | 'assistant')
  const history: { role: 'user' | 'assistant'; content: string }[] = recent
    .filter(m => m.role !== 'system')
    .slice(-12)
    .map(m => ({
      role:    (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));
  // Drop the just-saved user message — runChat adds it itself
  history.pop();

  // ─── Stream SSE ────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(obj) + '\n\n'));
      };

      try {
        const result = await runChat({
          cfg: {
            apiBase: widget.smmApiBase,
            apiKey:  widget.smmApiKey,
          },
          botName:           widget.botName,
          panelName:         widget.panelName,
          panelDomain:       widget.panelDomain,
          systemPromptExtra: widget.systemPromptExtra,
          history,
          userMessage:       message,
          onStep: (s) => send({ type: 'step', text: s.text, status: s.status }),
        });

        // Persist the bot reply
        const saved = await db.message.create({
          data: {
            widgetId:    widget.id,
            sessionId:   session!.id,
            role:        'bot',
            content:     result.reply,
            suggestions: result.suggestions.length ? JSON.stringify(result.suggestions) : null,
          },
        });

        send({
          type:        'done',
          reply:       result.reply,
          messageId:   saved.id,
          suggestions: result.suggestions,
          mode:        'bot',
          sessionToken: session!.sessionToken,
        });
      } catch (err: any) {
        console.error('[chatbot/message] error:', err);
        const errMsg = err?.message || 'Internal error';

        // Friendly error for missing LLM credentials
        if (errMsg.includes('GROQ_API_KEY')) {
          send({
            type: 'error',
            message: 'AI service is not configured. Please set GROQ_API_KEY environment variable in Vercel. Get a free key at https://console.groq.com/keys',
          });
        } else if (errMsg.includes('GEMINI_API_KEY')) {
          send({
            type: 'error',
            message: 'AI service is not configured. Please set GROQ_API_KEY environment variable in Vercel. Get a free key at https://console.groq.com/keys',
          });
        } else {
          send({ type: 'error', message: errMsg });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':                'text/event-stream; charset=utf-8',
      'Cache-Control':               'no-cache, no-transform',
      'Connection':                  'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering':           'no',
    },
  });
}

export async function OPTIONS() {
  const res = new Response(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  return res;
}
