#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────────────
# Vercel deploy helper — does NOT deploy, just prepares everything
# Run this before your first Vercel deploy.
#
# Usage:
#   bash scripts/vercel-prepare.sh
# ───────────────────────────────────────────────────────────────────────────
set -e

cd "$(dirname "$0")/.."
PROJECT_DIR="$(pwd)"

echo "═══════════════════════════════════════════════════════════════"
echo "  SMM AI Chatbot — Vercel Deploy Preparation"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── 1. Check DATABASE_URL is set ────────────────────────────────────────
if [ ! -f .env ]; then
  echo "❌ .env file not found."
  echo "   Copy .env.example to .env and add your Neon DATABASE_URL:"
  echo "   cp .env.example .env"
  echo "   Then edit .env and paste your connection string."
  exit 1
fi

source .env
if [ -z "$DATABASE_URL" ] || [[ "$DATABASE_URL" == *USER* ]]; then
  echo "❌ DATABASE_URL is not set (still has placeholder 'USER')."
  echo "   Edit .env and replace with your Neon connection string."
  echo "   Get one at https://neon.tech (free)"
  exit 1
fi
echo "✅ DATABASE_URL is set"

# ── 2. Generate Prisma client ───────────────────────────────────────────
echo ""
echo "→ Generating Prisma client..."
bun run db:generate
echo "✅ Prisma client generated"

# ── 3. Push schema to Postgres ──────────────────────────────────────────
echo ""
echo "→ Pushing schema to your Postgres DB..."
bun run db:push
echo "✅ Tables created"

# ── 4. Seed default widget ──────────────────────────────────────────────
echo ""
echo "→ Seeding default widget config..."
bun run seed
echo "✅ Default widget seeded"

# ── 5. Lint check ───────────────────────────────────────────────────────
echo ""
echo "→ Running ESLint..."
bun run lint
echo "✅ Lint passed"

# ── 6. Show next steps ──────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ Preparation complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Push your code to GitHub"
echo "  2. Go to https://vercel.com → Add New Project → Import your repo"
echo "  3. Add these env vars in Vercel:"
echo "       DATABASE_URL = $DATABASE_URL"
echo "  4. Click Deploy"
echo ""
echo "  OR use Vercel CLI:"
echo "       npm i -g vercel"
echo "       vercel login"
echo "       vercel --prod"
echo ""
echo "📖 Full guide: see DEPLOY.md"
echo ""
