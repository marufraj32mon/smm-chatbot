# 🚀 Deploy to Vercel — Step-by-Step Guide

This guide walks you through deploying the **SMM AI Chatbot** to Vercel with a free Neon Postgres database.

**Total time:** ~10 minutes
**Monthly cost:** $0 (free tiers)

---

## Step 1 — Create a free Postgres database on Neon

Neon is a serverless Postgres provider with a generous free tier — perfect for Vercel deployments.

1. Go to **https://neon.tech** → click **Sign up** (GitHub/Google/email)
2. Create a new project → name it `smm-chatbot`
3. Pick the region closest to your Vercel deployment region (default `sin1` Singapore is fine)
4. Once created, you'll see two connection strings on the dashboard:
   - **Pooled connection** (recommended for app) — looks like:
     ```
     postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require
     ```
   - **Direct connection** (for migrations) — same but without `-pooler`
5. Copy **both** strings — you'll need them below

> 💡 Alternative providers: **Vercel Postgres** (built-in), **Supabase**, **Railway**. All work the same way — just get a `DATABASE_URL` connection string.

---

## Step 2 — Push this project to GitHub

If you haven't already:

```bash
cd /home/z/my-project

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit — SMM AI Chatbot"

# Create a new repo on GitHub.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/smm-chatbot.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Import to Vercel

1. Go to **https://vercel.com** → sign in with GitHub
2. Click **Add New → Project**
3. Find your `smm-chatbot` repo → click **Import**
4. Vercel auto-detects Next.js — leave the defaults

### Configure Environment Variables (CRITICAL)

On the "Configure Project" step, click **Environment Variables** and add:

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | `postgresql://...-pooler...?sslmode=require` (your Neon **pooled** string) | Production, Preview, Development |
| `DIRECT_URL` | `postgresql://...direct...?sslmode=require` (your Neon **direct** string) | Production, Preview, Development |

> ⚠️ **Without `DATABASE_URL` the build will fail.** Prisma needs it at build time to generate the client.

5. Click **Deploy** — Vercel will:
   - Install dependencies (triggers `postinstall` → `prisma generate`)
   - Run `bun run vercel-build` (which runs `prisma generate` + `next build`)
   - Deploy your app to `https://smm-chatbot-xxx.vercel.app`

This takes 2-3 minutes. Wait for the "Congratulations" screen.

---

## Step 4 — Create database tables

After the first deploy, you need to create the tables in Postgres. Run this **locally**:

```bash
# 1. Make sure your local .env has the Neon DATABASE_URL
#    (same value you put in Vercel)
cat .env  # should show: DATABASE_URL=postgresql://...

# 2. Push the Prisma schema to your Neon DB
bun run db:push

# 3. Seed the default widget config
bun run seed
```

You should see:
```
🚀  Your database is now in sync with your Prisma schema.
✅ Seeded default widget. publicKey=smmgen_demo_public_key
```

> 💡 Alternatively: use Vercel's CLI — `vercel env pull .env && bun run db:push && bun run seed`

---

## Step 5 — Verify the deployment

1. Open your Vercel URL: `https://smm-chatbot-xxx.vercel.app`
2. You should see the SMMGEN demo homepage with the purple chat bubble in the bottom-right
3. Click the bubble → chat window opens → greeting message + 4 suggestion chips
4. Send a message → bot should reply (after a few seconds while LLM processes)
5. Open `/admin` → configure your MothersSMM API key → save → test with real order data

---

## Step 6 — Embed on your real website

Once verified, grab your production embed snippet from `/admin → Embed tab`:

```html
<script
  src="https://smm-chatbot-xxx.vercel.app/chatbot/widget.js"
  data-key="smmgen_demo_public_key"
  async></script>
```

Paste this **just before `</body>`** on any website where you want the chatbot to appear:
- WordPress (footer.php or a Code Snippets plugin)
- Shopify (theme.liquid)
- Plain HTML / PHP / Laravel / Django / etc.
- Any framework that lets you add a `<script>` tag

The widget is fully self-contained — no npm install, no React, no framework required.

---

## Optional — Custom Domain

1. Vercel dashboard → your project → **Settings → Domains**
2. Add your domain (e.g. `chatbot.yourbrand.com`)
3. Add a CNAME record at your DNS provider pointing to `cname.vercel-dns.com`
4. Vercel auto-provisions SSL (Let's Encrypt)
5. Update your embed snippet's `src=` to use the new domain

---

## Optional — Vercel CLI deploy (without GitHub)

If you prefer CLI over GitHub:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# From project root:
vercel link           # link this folder to a Vercel project
vercel env add DATABASE_URL production preview development
vercel env add DIRECT_URL    production preview development

# Deploy to production
vercel --prod
```

---

## Troubleshooting

### ❌ Build fails with "Prisma can't reach database server"
- Check that `DATABASE_URL` is set in Vercel env vars (not just locally)
- Verify the connection string has `?sslmode=require` at the end
- Make sure Neon's "IP Allow" is set to `0.0.0.0/0` (allow all — Vercel uses dynamic IPs)

### ❌ "Cannot find module '@prisma/client'"
- Run `bun run db:generate` locally to generate the client
- Verify `postinstall` script in `package.json` is `"postinstall": "prisma generate"`
- Clear Vercel build cache: Project Settings → Advanced → "Redeploy" with "Use existing build cache" UNCHECKED

### ❌ Chatbot widget loads but messages fail with 500
- Check Vercel function logs: Project → Functions → `/api/chatbot/message`
- Most likely `DATABASE_URL` is missing or DB tables don't exist
- Run `bun run db:push` again to make sure tables are created

### ❌ LLM replies are slow (>10s)
- Vercel Hobby plan has a 10s function timeout — upgrade to Pro for 60s
- Already configured: `vercel.json` sets `maxDuration: 60` for the message route
- On Hobby plan, this gets capped at 10s — first reply may be truncated

### ❌ Widget shows "Failed to init chatbot"
- Open browser dev tools → Network tab → check `/api/chatbot/init?key=...`
- If 404: widget URL is wrong (use absolute Vercel URL in `src=`)
- If 500: check Vercel function logs for the init route

---

## File changes made for Vercel

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Switched `provider` from `sqlite` to `postgresql`, added `@db.Text` / `@db.VarChar` annotations |
| `package.json` | Added `postinstall: prisma generate` (needed for Vercel build), `vercel-build` script, `seed` script |
| `next.config.ts` | Added explicit CORS headers for `/chatbot/*` and `/api/chatbot/*` |
| `vercel.json` | Function timeout config, region selection, CORS headers |
| `.env.example` | Template with all required env vars |
| `.env` | Local dev template — replace with real Neon URL |

---

## Cost estimate

| Service | Free tier | You'll pay when |
|---------|-----------|-----------------|
| **Vercel Hobby** | 100 GB bandwidth, 100 GB-h serverless | >100 GB bandwidth or 60s function timeout needed |
| **Neon Free** | 0.5 GB storage, 191 compute hours/month | DB >0.5 GB or always-on compute needed |
| **Total for prototype** | **$0/month** | — |

For production with real customers, expect to pay ~$20/month once you exceed free tiers.
