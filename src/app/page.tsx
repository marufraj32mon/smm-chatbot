'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  Zap,
  Shield,
  Headphones,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  ChevronRight,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ────────────────────────────────────────────────────────────────────────────
// Demo SMM Panel homepage that embeds the chatbot widget.
// The widget is loaded by injecting <script src="/chatbot/widget.js" data-key="...">
// exactly as a real customer would on their site.
// ────────────────────────────────────────────────────────────────────────────

const PUBLIC_KEY = 'smmgen_demo_public_key';

const SERVICES = [
  { icon: Instagram, platform: 'Instagram', name: 'Real Followers', price: '$1.20 / 1000', perk: 'High quality, no drop', color: 'from-pink-500 to-purple-600' },
  { icon: Youtube,   platform: 'YouTube',   name: 'Watch Time',     price: '$3.50 / 1000', perk: 'Monetization-safe',    color: 'from-red-500 to-rose-600' },
  { icon: Facebook,  platform: 'Facebook',  name: 'Page Likes',     price: '$2.10 / 1000', perk: 'Worldwide geo',        color: 'from-blue-500 to-indigo-600' },
  { icon: Twitter,   platform: 'Twitter / X', name: 'Followers',    price: '$4.80 / 1000', perk: 'Real-looking profiles', color: 'from-slate-700 to-black' },
  { icon: TrendingUp, platform: 'TikTok',   name: 'Likes & Views',  price: '$0.90 / 1000', perk: 'Instant start',         color: 'from-fuchsia-500 to-pink-600' },
];

const STATS = [
  { icon: Users,      label: 'Active customers',    value: '48,200+' },
  { icon: Zap,        label: 'Orders delivered',    value: '12.4M+' },
  { icon: Clock,      label: 'Avg. start time',     value: '2 min' },
  { icon: Star,       label: 'Avg. rating',         value: '4.9 / 5' },
];

const FAQS = [
  { q: 'How fast will my order start?', a: 'Most orders start within 1–5 minutes. Larger orders may take up to 30 minutes to begin processing.' },
  { q: 'What payment methods are accepted?', a: 'We accept credit/debit cards, PayPal, cryptocurrency (BTC, ETH, USDT), and Perfect Money.' },
  { q: 'Is there a refill guarantee?', a: 'Yes — most services include a 30–90 day refill guarantee. The exact period is listed on each service page.' },
  { q: 'Do you offer API for resellers?', a: 'Absolutely. Our v2 Admin API supports order pull, status change, refill, cancel, and more. Ask the chatbot for details!' },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // ── Inject the chatbot widget script ──────────────────────────────
  useEffect(() => {
    // Avoid double-injecting on hot reload
    if (document.getElementById('smm-chatbot-script')) return;

    const s = document.createElement('script');
    s.id = 'smm-chatbot-script';
    s.src = '/chatbot/widget.js';
    s.dataset.key = PUBLIC_KEY;
    s.async = true;
    document.body.appendChild(s);

    return () => {
      // Best-effort cleanup on unmount
      const w = document.getElementById('smm-chatbot-wrapper');
      if (w) w.remove();
      s.remove();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-violet-50/40 via-white to-white">
      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-black">
              S
            </div>
            <span className="text-xl font-bold tracking-tight">SMMGEN</span>
            <Badge className="ml-2 bg-violet-100 text-violet-700 hover:bg-violet-100">
              v2 API
            </Badge>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-violet-700 transition-colors">Services</a>
            <a href="#pricing" className="hover:text-violet-700 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-violet-700 transition-colors">FAQ</a>
            <a href="/admin" className="hover:text-violet-700 transition-colors">Admin</a>
          </nav>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            Sign in
          </Button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,58,237,0.18),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
          <Badge className="mb-5 bg-violet-100 text-violet-700 hover:bg-violet-100 border-violet-200">
            <Sparkles className="w-3 h-3 mr-1.5" /> AI-powered assistant included
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.05]">
            Grow your social presence<br />
            <span className="bg-gradient-to-r from-violet-600 to-purple-700 bg-clip-text text-transparent">
              at lightning speed
            </span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
            SMMGEN delivers real-looking followers, likes, and views across every major
            platform — backed by 24/7 support and our new AI assistant that recommends
            the best service for your goals.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white h-12 px-8">
              Get started <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 border-violet-200 text-violet-700 hover:bg-violet-50">
              Try the AI chatbot →
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {STATS.map(s => (
              <Card key={s.label} className="bg-white/70 border-violet-100 shadow-sm">
                <CardContent className="pt-5 pb-5 px-4 text-center">
                  <s.icon className="w-6 h-6 mx-auto mb-2 text-violet-600" />
                  <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────────────────── */}
      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Popular services</h2>
            <p className="mt-3 text-slate-600">Hand-picked best-value offers, refreshed daily.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map(s => (
              <Card key={s.name} className="group hover:shadow-xl hover:-translate-y-1 transition-all border-violet-100 overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${s.color}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-md`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-xs text-slate-500">
                      {s.platform}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg">{s.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold text-violet-700">{s.price}</div>
                      <div className="text-xs text-slate-500 mt-1">{s.perk}</div>
                    </div>
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                      Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why choose us ─────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-violet-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Why customers pick SMMGEN</h2>
            <p className="mt-3 text-slate-600">Four reasons our 48k+ customers keep coming back.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap,        title: 'Lightning fast',     desc: 'Orders start in under 2 minutes on average, with real-time progress tracking.' },
              { icon: Shield,     title: 'Safe & private',      desc: 'No password required. SSL-secured checkout. We never share your data.' },
              { icon: DollarSign, title: 'Best prices',         desc: 'Wholesale rates from $0.50 / 1000. Volume discounts for resellers.' },
              { icon: Headphones, title: '24/7 support',        desc: 'Live chat, ticket system, and our AI assistant — always available.' },
            ].map(f => (
              <Card key={f.title} className="bg-white border-violet-100">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-violet-700" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Assistant CTA ─────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white">
            <CardContent className="pt-10 pb-10 px-8 sm:px-12 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Badge className="bg-white/20 text-white hover:bg-white/20 border-0 mb-4">
                  ✨ New
                </Badge>
                <h3 className="text-3xl sm:text-4xl font-bold leading-tight">
                  Meet SMMGEN AI Assistant
                </h3>
                <p className="mt-4 text-violet-100 text-lg leading-relaxed">
                  Ask anything — “best TikTok likes”, “where is my order #12345”, “how do I
                  pay with USDT”. Our AI looks up live data from the panel and recommends
                  the right service in seconds.
                </p>
                <p className="mt-4 text-sm text-violet-200">
                  👉 Tap the chat bubble in the bottom-right corner to try it now.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white text-violet-700 flex items-center justify-center font-black">
                    S
                  </div>
                  <div>
                    <div className="font-bold">SMMGEN AI Assistant</div>
                    <div className="text-xs text-violet-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400" /> Online
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="bg-white text-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                    👋 Hi! What's the best TikTok likes service right now?
                  </div>
                  <div className="bg-violet-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] ml-auto">
                    Our top pick is <strong>TikTok Likes — Premium</strong> at $0.90/1000 with
                    instant start and a 30-day refill ✨
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-violet-50/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Frequently asked</h2>
            <p className="mt-3 text-slate-600">Quick answers — or ask the AI in the corner.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <Card key={i} className="bg-white border-violet-100">
                <button
                  className="w-full text-left p-5 flex items-center justify-between gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold">{f.q}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-violet-600 flex-shrink-0 transition-transform ${
                      openFaq === i ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed">{f.a}</div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-black text-sm">
                S
              </div>
              <span className="text-lg font-bold text-white">SMMGEN</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              The fastest-growing SMM panel with built-in AI assistant. Trusted by 48k+
              customers worldwide since 2021.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#services" className="hover:text-white">Services</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              <li><a href="/admin" className="hover:text-white">Admin panel</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>Live chat 24/7</li>
              <li>support@smmgen.example.com</li>
              <li>API docs</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>© 2026 SMMGEN. All rights reserved.</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            All systems operational
          </span>
        </div>
      </footer>
    </div>
  );
}
