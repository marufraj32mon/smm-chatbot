'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Save,
  Sparkles,
  Key,
  Bot,
  MessageSquare,
  Settings,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ChevronDown,
  Code,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

const DEFAULT_PUBLIC_KEY = 'smmgen_demo_public_key';

interface WidgetConfig {
  id: string;
  publicKey: string;
  secretKey: string;
  panelName: string;
  panelDomain: string;
  botName: string;
  widgetColor: string;
  buttonShape: string;
  buttonIcon: string;
  greetingMessage: string;
  greetingSuggestions: string;  // JSON array as string
  greetingIntervalHours: number;
  smmApiBase: string;
  smmApiKey: string;
  systemPromptExtra: string;
}

interface SessionRow {
  id: string;
  sessionToken: string;
  mode: string;
  lang: string;
  createdAt: string;
  _count: { messages: number };
}

export default function AdminPage() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Load config
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/widget?key=' + DEFAULT_PUBLIC_KEY);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setConfig(data);
    } catch (e: any) {
      toast.error('Failed to load widget config: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sessions?key=' + DEFAULT_PUBLIC_KEY);
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {}
  }, []);

  useEffect(() => { loadConfig(); loadSessions(); }, [loadConfig, loadSessions]);

  // Save config
  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/widget?key=' + DEFAULT_PUBLIC_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Save failed');
      }
      toast.success('Saved — widget will reflect changes on next page load.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Copy embed code
  const copyEmbed = () => {
    const code = `<script src="${window.location.origin}/chatbot/widget.js" data-key="${DEFAULT_PUBLIC_KEY}" async></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear all sessions
  const clearSessions = async () => {
    if (!confirm('Clear all chat sessions for this widget? Messages will be lost.')) return;
    try {
      await fetch('/api/admin/sessions?key=' + DEFAULT_PUBLIC_KEY, { method: 'DELETE' });
      toast.success('Sessions cleared.');
      loadSessions();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Validate JSON suggestions
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  useEffect(() => {
    if (!config) return;
    try {
      const arr = JSON.parse(config.greetingSuggestions || '[]');
      if (!Array.isArray(arr)) throw new Error('Must be an array');
      setSuggestionsError(null);
    } catch (e: any) {
      setSuggestionsError(e.message);
    }
  }, [config?.greetingSuggestions]);

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading widget config…
        </div>
      </div>
    );
  }

  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/chatbot/widget.js" data-key="${DEFAULT_PUBLIC_KEY}" async></script>`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-black">
              S
            </div>
            <div>
              <div className="font-bold leading-tight">SMMGEN Chatbot Admin</div>
              <div className="text-xs text-slate-500">Widget configuration</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="text-sm text-slate-600 hover:text-violet-700 px-3">
              ← Back to site
            </a>
            <Button onClick={save} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
              {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save changes
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 flex flex-wrap h-auto">
            <TabsTrigger value="general" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
              <Bot className="w-4 h-4 mr-1.5" /> General
            </TabsTrigger>
            <TabsTrigger value="greeting" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
              <MessageSquare className="w-4 h-4 mr-1.5" /> Greeting & Suggestions
            </TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
              <Sparkles className="w-4 h-4 mr-1.5" /> Services & Pricing
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
              <Key className="w-4 h-4 mr-1.5" /> SMM API
            </TabsTrigger>
            <TabsTrigger value="embed" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
              <Code className="w-4 h-4 mr-1.5" /> Embed
            </TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
              <MessageSquare className="w-4 h-4 mr-1.5" /> Sessions
            </TabsTrigger>
          </TabsList>

          {/* ── General ─────────────────────────────────────────────────── */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-violet-600" /> Widget appearance
                </CardTitle>
                <CardDescription>
                  Branding and look-and-feel of the chat bubble on your site.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="panelName">Panel name</Label>
                    <Input id="panelName" value={config.panelName}
                      onChange={e => setConfig({ ...config, panelName: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="botName">Bot display name</Label>
                    <Input id="botName" value={config.botName}
                      onChange={e => setConfig({ ...config, botName: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="panelDomain">Panel domain (for links in footer)</Label>
                    <Input id="panelDomain" value={config.panelDomain}
                      onChange={e => setConfig({ ...config, panelDomain: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="widgetColor">Widget accent color</Label>
                    <div className="flex gap-2 items-center">
                      <Input id="widgetColor" value={config.widgetColor}
                        onChange={e => setConfig({ ...config, widgetColor: e.target.value })} />
                      <div className="w-10 h-10 rounded-lg border border-slate-200"
                        style={{ background: config.widgetColor }} />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {['#6c5ce7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#0f172a'].map(c => (
                        <button key={c} onClick={() => setConfig({ ...config, widgetColor: c })}
                          className={`w-6 h-6 rounded-full border-2 ${config.widgetColor === c ? 'border-slate-900' : 'border-transparent'}`}
                          style={{ background: c }} aria-label={c} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="buttonShape">Button shape</Label>
                    <select id="buttonShape" className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                      value={config.buttonShape}
                      onChange={e => setConfig({ ...config, buttonShape: e.target.value })}>
                      <option value="circle">Circle</option>
                      <option value="rounded">Rounded</option>
                      <option value="squircle">Squircle</option>
                      <option value="bubble">Bubble</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="buttonIcon">Button icon</Label>
                    <select id="buttonIcon" className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                      value={config.buttonIcon}
                      onChange={e => setConfig({ ...config, buttonIcon: e.target.value })}>
                      <option value="chat">Chat bubble</option>
                      <option value="message">Message</option>
                      <option value="headset">Headset</option>
                      <option value="robot">Robot</option>
                      <option value="heart">Heart</option>
                      <option value="zap">Lightning</option>
                      <option value="help">Help</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="greetingIntervalHours">Greeting cooldown (hours)</Label>
                    <Input id="greetingIntervalHours" type="number" min={1}
                      value={config.greetingIntervalHours}
                      onChange={e => setConfig({ ...config, greetingIntervalHours: parseInt(e.target.value) || 24 })} />
                    <p className="text-xs text-slate-500 mt-1">How long before the greeting bubble re-shows to a visitor.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Greeting & Suggestions ─────────────────────────────────── */}
          <TabsContent value="greeting">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-violet-600" /> Greeting message
                </CardTitle>
                <CardDescription>
                  Shown as the first message when a visitor opens the chat. Markdown is supported: **bold**, • bullets, line breaks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea rows={12} className="font-mono text-sm"
                  value={config.greetingMessage}
                  onChange={e => setConfig({ ...config, greetingMessage: e.target.value })} />
                <div>
                  <Label htmlFor="suggestions">Greeting suggestions (JSON array)</Label>
                  <Textarea id="suggestions" rows={4} className="font-mono text-sm"
                    value={config.greetingSuggestions}
                    onChange={e => setConfig({ ...config, greetingSuggestions: e.target.value })} />
                  {suggestionsError ? (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Invalid JSON: {suggestionsError}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">
                      Chips shown below the greeting. E.g. <code>["Hello","Best TikTok Likes"]</code>
                    </p>
                  )}
                </div>
                <div>
                  <Label>Extra system instructions (optional)</Label>
                  <Textarea rows={4} className="font-mono text-sm"
                    placeholder="Add custom instructions for the AI — e.g. 'Always mention our 10% off coupon SMMGEN10'."
                    value={config.systemPromptExtra}
                    onChange={e => setConfig({ ...config, systemPromptExtra: e.target.value })} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SMM API ─────────────────────────────────────────────────── */}
          {/* ── Services & Pricing ───────────────────────────────────── */}
          <TabsContent value="services">
            <ServicesTab publicKey={DEFAULT_PUBLIC_KEY} />
          </TabsContent>

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-violet-600" /> MothersSMM Admin API connection
                </CardTitle>
                <CardDescription>
                  The chatbot uses these credentials to look up orders, payments, users, and tickets on your behalf.
                  Stored encrypted-at-rest in your DB; never exposed to the browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="smmApiBase">API base URL</Label>
                  <Input id="smmApiBase" value={config.smmApiBase}
                    onChange={e => setConfig({ ...config, smmApiBase: e.target.value })} />
                  <p className="text-xs text-slate-500 mt-1">Default: <code>https://mothersmm.com/adminapi/v2</code></p>
                </div>
                <div>
                  <Label htmlFor="smmApiKey">Admin API Key (X-Api-Key)</Label>
                  <Input id="smmApiKey" type="password" value={config.smmApiKey}
                    placeholder="Paste your MothersSMM admin API key…"
                    onChange={e => setConfig({ ...config, smmApiKey: e.target.value })} />
                  <p className="text-xs text-slate-500 mt-1">
                    Get this from your MothersSMM panel → Admin → API Keys.
                  </p>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 text-sm text-violet-900">
                  <Sparkles className="w-4 h-4 inline-block mr-1" />
                  <strong>What the bot can do with API access:</strong>
                  <ul className="mt-2 ml-5 list-disc space-y-1">
                    <li>List & get orders by ID — “where is order #12345?”</li>
                    <li>List payments — “show my last deposit”</li>
                    <li>List tickets — “any open support tickets?”</li>
                    <li>List users (admin-level)</li>
                    <li>Request cancellation of an order</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Embed ──────────────────────────────────────────────────── */}
          <TabsContent value="embed">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-violet-600" /> Embed on your website
                </CardTitle>
                <CardDescription>
                  Paste this snippet just before <code>&lt;/body&gt;</code> on any page where you want the chatbot to appear.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto font-mono">
                    {embedCode}
                  </pre>
                  <Button size="sm" className="absolute top-2 right-2 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={copyEmbed}>
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Public key</div>
                    <code className="text-sm break-all">{config.publicKey}</code>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Widget endpoint</div>
                    <code className="text-sm break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/chatbot/widget.js</code>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                  <AlertCircle className="w-4 h-4 inline-block mr-1" />
                  The widget is fully self-contained — no npm install, no React, no framework required. It works on plain HTML, WordPress, Shopify, Next.js, or anywhere else.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Sessions ──────────────────────────────────────────────── */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-violet-600" /> Recent chat sessions
                  </span>
                  <Button size="sm" variant="outline" onClick={clearSessions}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear all
                  </Button>
                </CardTitle>
                <CardDescription>
                  Each row is a visitor conversation. Mode = bot / pending / human.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No chat sessions yet. Open the site and click the chat bubble to start one.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left py-2 px-4 font-medium">Session token</th>
                          <th className="text-left py-2 px-4 font-medium">Mode</th>
                          <th className="text-left py-2 px-4 font-medium">Lang</th>
                          <th className="text-left py-2 px-4 font-medium">Messages</th>
                          <th className="text-left py-2 px-4 font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(s => (
                          <tr key={s.id} className="border-t border-slate-100">
                            <td className="py-2 px-4 font-mono text-xs">
                              {s.sessionToken.slice(0, 16)}…
                            </td>
                            <td className="py-2 px-4">
                              <Badge variant="outline" className={
                                s.mode === 'human' ? 'border-green-200 text-green-700 bg-green-50' :
                                s.mode === 'pending' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                'border-slate-200 text-slate-600 bg-slate-50'
                              }>{s.mode}</Badge>
                            </td>
                            <td className="py-2 px-4">{s.lang}</td>
                            <td className="py-2 px-4">{s._count.messages}</td>
                            <td className="py-2 px-4 text-slate-500">
                              {new Date(s.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Button size="sm" variant="outline" className="mt-4" onClick={loadSessions}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Services Tab Component ─────────────────────────────────────────────
interface ServiceRow {
  id: string;
  externalId: string | null;
  name: string;
  platform: string;
  category: string;
  rate: number;
  currency: string;
  minOrder: number;
  maxOrder: number;
  avgTime: string;
  description: string;
  quality: string;
  isActive: boolean;
}

function ServicesTab({ publicKey }: { publicKey: string }) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState({
    name: '', platform: 'Facebook', category: 'Followers',
    rate: '', currency: 'USD', minOrder: '10', maxOrder: '50000',
    avgTime: '', description: '', quality: 'standard',
    externalId: '', isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/services?key=' + publicKey);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setServices(data.services || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => { load(); }, [load]);

  const startAdd = () => {
    setEditing(null);
    setForm({
      name: '', platform: 'Facebook', category: 'Followers',
      rate: '', currency: 'USD', minOrder: '10', maxOrder: '50000',
      avgTime: '', description: '', quality: 'standard',
      externalId: '', isActive: true,
    });
    setShowForm(true);
  };

  const startEdit = (s: ServiceRow) => {
    setEditing(s);
    setForm({
      name: s.name, platform: s.platform, category: s.category,
      rate: String(s.rate), currency: s.currency,
      minOrder: String(s.minOrder), maxOrder: String(s.maxOrder),
      avgTime: s.avgTime, description: s.description, quality: s.quality,
      externalId: s.externalId || '', isActive: s.isActive,
    });
    setShowForm(true);
  };

  const saveService = async () => {
    if (!form.name || !form.rate) {
      toast.error('Name and Rate are required');
      return;
    }
    try {
      const url = editing
        ? '/api/admin/services/' + editing.id + '?key=' + publicKey
        : '/api/admin/services?key=' + publicKey;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Save failed');
      }
      toast.success(editing ? 'Service updated' : 'Service added');
      setShowForm(false);
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (s: ServiceRow) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    try {
      await fetch('/api/admin/services/' + s.id + '?key=' + publicKey, { method: 'DELETE' });
      toast.success('Service deleted');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading services…</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" /> Services & Pricing Catalog
          </span>
          <Button size="sm" onClick={startAdd} className="bg-violet-600 hover:bg-violet-700 text-white">
            ✚ Add service
          </Button>
        </CardTitle>
        <CardDescription>
          The chatbot uses this catalog to answer pricing questions (e.g. "Facebook followers cheapest price?").
          Add your real panel services here. Cheapest first when bot recommends.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6 p-5 bg-violet-50/50 border border-violet-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-violet-900">
                {editing ? 'Edit service' : 'Add new service'}
              </h4>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>✕ Cancel</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Service name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Facebook Followers [Real] [Max 50K]" />
              </div>
              <div>
                <Label>Platform *</Label>
                <select className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                  value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                  {['Facebook', 'Instagram', 'TikTok', 'YouTube', 'Twitter', 'Telegram', 'LinkedIn', 'Spotify', 'Other'].map(p =>
                    <option key={p} value={p}>{p}</option>
                  )}
                </select>
              </div>
              <div>
                <Label>Category *</Label>
                <select className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {['Followers', 'Likes', 'Views', 'Comments', 'Subscribers', 'WatchTime', 'Shares', 'Saves', 'Other'].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
              <div>
                <Label>Rate per 1000 *</Label>
                <Input type="number" step="0.01" value={form.rate}
                  onChange={e => setForm({ ...form, rate: e.target.value })}
                  placeholder="e.g. 1.20" />
              </div>
              <div>
                <Label>Min order</Label>
                <Input type="number" value={form.minOrder}
                  onChange={e => setForm({ ...form, minOrder: e.target.value })} />
              </div>
              <div>
                <Label>Max order</Label>
                <Input type="number" value={form.maxOrder}
                  onChange={e => setForm({ ...form, maxOrder: e.target.value })} />
              </div>
              <div>
                <Label>Avg delivery time</Label>
                <Input value={form.avgTime} onChange={e => setForm({ ...form, avgTime: e.target.value })}
                  placeholder="e.g. 0-2 hours" />
              </div>
              <div>
                <Label>Quality</Label>
                <select className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                  value={form.quality} onChange={e => setForm({ ...form, quality: e.target.value })}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Description (shown to bot for context)</Label>
                <Textarea rows={2} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Real-looking followers, lifetime guarantee, no drop" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveService} className="bg-violet-600 hover:bg-violet-700 text-white">
                {editing ? 'Update service' : 'Add service'}
              </Button>
            </div>
          </div>
        )}

        {services.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No services yet. Click "Add service" to create your first one — the bot will use this catalog to answer pricing questions.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left py-2 px-3 font-medium">Service</th>
                  <th className="text-left py-2 px-3 font-medium">Platform</th>
                  <th className="text-left py-2 px-3 font-medium">Category</th>
                  <th className="text-left py-2 px-3 font-medium">Rate/1K</th>
                  <th className="text-left py-2 px-3 font-medium">Quality</th>
                  <th className="text-left py-2 px-3 font-medium">Delivery</th>
                  <th className="text-right py-2 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <div className="font-medium text-slate-800">{s.name}</div>
                      {s.description && <div className="text-xs text-slate-500 mt-0.5">{s.description}</div>}
                    </td>
                    <td className="py-2 px-3">{s.platform}</td>
                    <td className="py-2 px-3">{s.category}</td>
                    <td className="py-2 px-3 font-mono font-bold text-violet-700">${s.rate}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className={
                        s.quality === 'premium' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                        s.quality === 'vip' ? 'border-rose-200 text-rose-700 bg-rose-50' :
                        'border-slate-200 text-slate-600 bg-slate-50'
                      }>{s.quality}</Badge>
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-xs">{s.avgTime || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(s)} className="text-violet-700 h-8 px-2">
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(s)} className="text-red-600 h-8 px-2">
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 bg-violet-50 border border-violet-100 rounded-lg p-4 text-sm text-violet-900">
          <Sparkles className="w-4 h-4 inline-block mr-1" />
          <strong>How the bot uses this:</strong> When a user asks about pricing or service recommendations,
          the bot calls <code>list_services</code> tool which queries this catalog sorted by rate (cheapest first).
          The bot then presents the top results with real prices from your panel.
        </div>
      </CardContent>
    </Card>
  );
}
