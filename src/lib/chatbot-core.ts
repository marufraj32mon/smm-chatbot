/**
 * Chatbot core — Groq LLM (Llama 3.3 70B) + MothersSMM function calling.
 *
 * Why Groq?
 *   - 14,400 free requests/day (vs Gemini's 1,500)
 *   - Ultra-fast (~0.5s response time)
 *   - No region restrictions (works globally, incl. Bangladesh)
 *   - Free forever, no credit card required
 *
 * Flow:
 *  1. Maintain conversation context per session.
 *  2. Groq (OpenAI-compatible API) is given a system prompt + tool catalog.
 *  3. The LLM can call tools (list orders, get order, list payments, list tickets,
 *     list users, etc.). We execute them and feed results back.
 *  4. The final assistant message is returned as the bot reply.
 *
 * Streaming protocol (SSE events):
 *  - { type: "step", text, status: "active"|"done" }
 *  - { type: "done", reply, messageId, suggestions?, mode }
 *  - { type: "error", message }
 */

import { getGroq, GROQ_MODEL } from './groq-init';
import type { SmmConfig } from './smm-api';
import * as smm from './smm-api';
import { db } from './db';

export interface ChatStep {
  text:   string;
  status: 'active' | 'done';
}

export interface ChatResult {
  reply:       string;
  suggestions: string[];
  toolCalls:   number;
  steps:       ChatStep[];
}

// ─── Tool catalog (OpenAI-compatible format, which Groq uses) ─────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_services',
      description: 'List SMM services from the panel catalog with their prices. USE THIS when the user asks about service prices, recommendations, "best", "cheapest", or any pricing/service question (e.g. "Facebook follower price", "best TikTok likes", "Instagram views cheapest rate"). Filter by platform and/or category when relevant.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'Filter by platform: Facebook | Instagram | TikTok | YouTube | Twitter. Use this when user mentions a specific platform.' },
          category: { type: 'string', description: 'Filter by category: Followers | Likes | Views | Comments | Subscribers | WatchTime. Use this when user mentions a specific service type.' },
          limit:    { type: 'integer', description: 'Max services to return (default 10, max 50)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_orders',
      description: 'List recent orders placed on the SMM panel. Use ONLY when the user asks about specific past orders, order history, or order status — NOT for service pricing.',
      parameters: {
        type: 'object',
        properties: {
          limit:  { type: 'integer', description: 'Max orders to return (default 10, max 100)' },
          offset: { type: 'integer', description: 'Pagination offset' },
          status: { type: 'string',  description: 'Filter by status: Pending | Processing | In progress | Completed | Partial | Canceled | Refunded' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Get details of a specific order by ID. Use when the user asks about a specific order number.',
      parameters: {
        type: 'object',
        properties: { order_id: { type: 'string', description: 'Order ID' } },
        required: ['order_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_payments',
      description: 'List recent payment transactions. Use when user asks about payments, deposits, or transaction history.',
      parameters: {
        type: 'object',
        properties: {
          limit:  { type: 'integer' },
          offset: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_users',
      description: 'List registered users on the SMM panel. Useful for admin-level questions.',
      parameters: {
        type: 'object',
        properties: {
          limit:  { type: 'integer' },
          offset: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tickets',
      description: 'List support tickets. Use when user asks about support tickets, complaints, or open issues.',
      parameters: {
        type: 'object',
        properties: {
          limit:  { type: 'integer' },
          offset: { type: 'integer' },
          status: { type: 'string', description: 'Open | Answered | Closed' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ticket',
      description: 'Get a specific ticket by ID, including message thread.',
      parameters: {
        type: 'object',
        properties: { ticket_id: { type: 'string' } },
        required: ['ticket_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_cancel_order',
      description: 'Request cancellation of an order. Only call this if the user explicitly asks to cancel an order and provides an order ID.',
      parameters: {
        type: 'object',
        properties: { order_id: { type: 'string' } },
        required: ['order_id'],
      },
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────
async function executeTool(name: string, args: any, cfg: SmmConfig, widgetId: string): Promise<string> {
  let result: any;

  // Coerce numeric string args to integers (Groq sometimes returns strings)
  const safeInt = (v: any, fallback: number) => {
    if (v === undefined || v === null) return fallback;
    const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  switch (name) {
    case 'list_services': {
      // Query the local Service catalog (no SMM API endpoint for this)
      const platform = args.platform as string | undefined;
      const category = args.category as string | undefined;
      const limit = Math.min(safeInt(args.limit, 10), 50);

      const where: any = { widgetId, isActive: true };
      if (platform) {
        where.platform = { contains: platform, mode: 'insensitive' };
      }
      if (category) {
        where.category = { contains: category, mode: 'insensitive' };
      }

      const services = await db.service.findMany({
        where,
        orderBy: { rate: 'asc' }, // cheapest first
        take: limit,
        select: {
          name: true, platform: true, category: true,
          rate: true, currency: true, minOrder: true, maxOrder: true,
          avgTime: true, quality: true, description: true, externalId: true,
        },
      });
      result = {
        ok: true,
        count: services.length,
        services: services.map(s => ({
          ...s,
          ratePer1000: s.rate,
          priceNote: `$${s.rate} per 1000 ${s.category.toLowerCase()}`,
        })),
      };
      break;
    }
    case 'list_orders':
      result = await smm.safe(smm.orders.list(cfg, {
        limit:  safeInt(args.limit, 10),
        offset: safeInt(args.offset, 0),
        status: args.status,
      }));
      break;
    case 'get_order':
      result = await smm.safe(smm.orders.get(cfg, args.order_id));
      break;
    case 'list_payments':
      result = await smm.safe(smm.payments.list(cfg, {
        limit:  safeInt(args.limit, 10),
        offset: safeInt(args.offset, 0),
      }));
      break;
    case 'list_users':
      result = await smm.safe(smm.users.list(cfg, {
        limit:  safeInt(args.limit, 10),
        offset: safeInt(args.offset, 0),
      }));
      break;
    case 'list_tickets':
      result = await smm.safe(smm.tickets.list(cfg, {
        limit:  safeInt(args.limit, 10),
        offset: safeInt(args.offset, 0),
        status: args.status,
      }));
      break;
    case 'get_ticket':
      result = await smm.safe(smm.tickets.get(cfg, args.ticket_id));
      break;
    case 'request_cancel_order':
      result = await smm.safe(smm.orders.requestCancel(cfg, args.order_id));
      break;
    default:
      result = { ok: false, error: `Unknown tool: ${name}` };
  }

  const json = JSON.stringify(result);
  if (json.length > 6000) {
    return json.slice(0, 6000) + '\n...[truncated]';
  }
  return json;
}

// ─── Default system prompt ─────────────────────────────────────────────
function buildSystemPrompt(opts: {
  botName:          string;
  panelName:        string;
  panelDomain:      string;
  systemPromptExtra: string;
}): string {
  return `You are "${opts.botName}", the AI assistant for "${opts.panelName}", an SMM (Social Media Marketing) panel website.

# Your role
- Recommend the **best services** to customers using performance data, pricing, and insights from ${opts.panelName}'s order history.
- Help customers check their **recent orders**, **order status**, **payments**, **support tickets**.
- Answer **general questions** about pricing, services, delivery times, and how the panel works — in **any language** the user writes in.
- Be friendly, helpful, and concise. Use bullet points and bold text where it improves readability.

# What you can do
You have access to the ${opts.panelName} Admin API. The following tools are available:
- **list_services** — service catalog with REAL prices. Call this for ANY service/pricing question (e.g. "Facebook followers price", "best TikTok likes", "cheapest Instagram views"). Filter by platform and category when relevant.
- list_orders — past orders
- get_order — single order by ID
- list_payments — payment history
- list_users — panel users (admin-level)
- list_tickets / get_ticket — support tickets
- request_cancel_order — request order cancellation

# Rules
1. **For service/pricing questions, ALWAYS call list_services first.** Use the platform filter (Facebook, Instagram, TikTok, YouTube, Twitter) and category filter (Followers, Likes, Views, Comments, Subscribers, WatchTime) when the user mentions them.
2. When the user asks about "best" or "cheapest", call list_services, sort results by rate (cheapest first), and recommend the top option(s).
3. For order/payment/ticket questions, call the appropriate tool.
4. When you receive tool results, summarize them clearly — never dump raw JSON. Show prices as "$X per 1000".
5. If a tool fails (e.g. rate limit, missing API key), tell the user politely and offer to continue without that data.
6. If you can't find the user's specific service, tell them so and suggest they check the panel directly at ${opts.panelDomain}.
7. If the user asks for something you cannot do (refunds, account changes), tell them to contact human support.
8. **Always reply in the same language as the user's message.** If they write Bengali, reply in Bengali. If English, reply in English. Etc.
9. Use markdown sparingly: **bold** for emphasis, bullet lists for items.
10. Keep replies under 250 words unless the user explicitly asks for detail.

# Panel info
- Panel name: ${opts.panelName}
- Panel domain: ${opts.panelDomain}

${opts.systemPromptExtra ? `# Additional instructions\n${opts.systemPromptExtra}` : ''}

Start every fresh conversation by greeting the user (briefly) when they say "hello" or "hi".`;
}

// ─── Main chat function ────────────────────────────────────────────────
export interface ChatOptions {
  cfg:                SmmConfig;
  widgetId:           string;     // required for querying local Service catalog
  botName:            string;
  panelName:          string;
  panelDomain:        string;
  systemPromptExtra:  string;
  history:            { role: 'user' | 'assistant'; content: string }[];
  userMessage:        string;
  onStep?:            (step: ChatStep) => void;
}

export async function runChat(opts: ChatOptions): Promise<ChatResult> {
  const steps: ChatStep[] = [];
  const pushStep = (text: string, status: 'active' | 'done' = 'active') => {
    const s = { text, status };
    steps.push(s);
    opts.onStep?.(s);
  };

  const client = getGroq();
  const systemPrompt = buildSystemPrompt(opts);

  pushStep('🤖 Understanding your question...', 'done');
  pushStep('🔍 Looking up data from the panel...');

  // Build OpenAI-compatible messages array
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...opts.history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: opts.userMessage },
  ];

  let toolCallCount = 0;
  const MAX_ITERATIONS = 4;
  let finalReply = '';

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      tools: TOOLS as any,
      tool_choice: 'auto',
      temperature: 0.6,
      max_tokens: 1024,
    });

    const msg = response.choices?.[0]?.message as any;
    if (!msg) {
      finalReply = "I'm sorry, I couldn't generate a response. Please try again.";
      break;
    }

    // Append assistant message (with potential tool_calls)
    messages.push({
      role: 'assistant',
      content: msg.content || '',
      tool_calls: msg.tool_calls,
    });

    // No tool calls → final answer
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      finalReply = msg.content || '';
      break;
    }

    // Execute each tool call
    for (const call of msg.tool_calls) {
      toolCallCount++;
      const fnName = call.function?.name;
      let args: any = {};
      try { args = JSON.parse(call.function?.arguments || '{}'); } catch {}

      if (steps.length > 0) steps[steps.length - 1].status = 'done';
      pushStep(`⚙️ Calling ${fnName}...`);

      const toolResult = await executeTool(fnName, args, opts.cfg, opts.widgetId);
      steps[steps.length - 1].status = 'done';

      // Feed result back as tool message
      messages.push({
        role: 'tool',
        content: toolResult,
        tool_call_id: call.id,
      });
    }
  }

  if (!finalReply) finalReply = 'Sorry, I could not process that.';

  // ─── Generate follow-up suggestions ────────────────────────────────
  let suggestions: string[] = [];
  try {
    const suggResp = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Based on the conversation, generate 3-4 short follow-up questions the user might want to ask next. Reply with ONLY a JSON array of strings, each ≤ 50 chars. Example: ["Check order status", "Show my payments"]',
        },
        ...messages.slice(-4),
      ],
      temperature: 0.8,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });
    const suggText = suggResp.choices?.[0]?.message?.content?.trim() || '';
    // Parse — Groq with json_object mode returns { "suggestions": [...] } or just an array
    try {
      const parsed = JSON.parse(suggText);
      suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);
    } catch {
      // If not valid JSON, try to extract array
      const match = suggText.match(/\[[\s\S]*\]/);
      if (match) suggestions = JSON.parse(match[0]);
    }
    if (!Array.isArray(suggestions)) suggestions = [];
  } catch {
    // Non-critical
  }

  return { reply: finalReply, suggestions, toolCalls: toolCallCount, steps };
}
