/**
 * Seed sample SMM services into the database.
 * These will be used by the chatbot's `list_services` tool to answer
 * real pricing questions like "best Facebook followers cheapest price?"
 *
 * Run with:
 *   DATABASE_URL=... bun run scripts/seed-services.ts
 */
import { db } from '../src/lib/db';

async function main() {
  const widget = await db.widget.findUnique({ where: { publicKey: 'smmgen_demo_public_key' } });
  if (!widget) {
    console.error('❌ Widget not found. Run scripts/seed.ts first.');
    process.exit(1);
  }

  const services = [
    // ─── Facebook ─────────────────────────────────────────────────────
    { externalId: '11', name: 'Facebook Followers [Real] [Max 50K]',           platform: 'Facebook',  category: 'Followers', rate: 1.20, minOrder: 50,   maxOrder: 50000,  avgTime: '0-2 hours',  quality: 'standard', description: 'Real-looking Facebook followers, lifetime guarantee.' },
    { externalId: '12', name: 'Facebook Followers [Premium] [Max 100K]',       platform: 'Facebook',  category: 'Followers', rate: 2.40, minOrder: 50,   maxOrder: 100000, avgTime: '0-6 hours',  quality: 'premium',  description: 'High-quality premium followers, no drop, 365-day refill.' },
    { externalId: '13', name: 'Facebook Page Likes [Real] [Max 100K]',         platform: 'Facebook',  category: 'Likes',     rate: 1.50, minOrder: 50,   maxOrder: 100000, avgTime: '0-3 hours',  quality: 'standard', description: 'Real page likes from active accounts.' },
    { externalId: '14', name: 'Facebook Post Likes [Cheapest] [Max 30K]',      platform: 'Facebook',  category: 'Likes',     rate: 0.40, minOrder: 20,   maxOrder: 30000,  avgTime: '0-30 mins',  quality: 'standard', description: 'Cheapest post likes on the panel, instant start.' },
    { externalId: '15', name: 'Facebook Video Views [Fast] [Max 1M]',          platform: 'Facebook',  category: 'Views',     rate: 0.10, minOrder: 100,  maxOrder: 1000000,avgTime: '0-15 mins',  quality: 'standard', description: 'Fast video views, instant start.' },

    // ─── Instagram ────────────────────────────────────────────────────
    { externalId: '21', name: 'Instagram Followers [Real] [Max 100K]',         platform: 'Instagram', category: 'Followers', rate: 0.85, minOrder: 50,   maxOrder: 100000, avgTime: '0-1 hour',   quality: 'standard', description: 'Real-looking IG followers, 30-day refill guarantee.' },
    { externalId: '22', name: 'Instagram Followers [Premium] [No Drop]',        platform: 'Instagram', category: 'Followers', rate: 1.75, minOrder: 50,   maxOrder: 500000, avgTime: '0-3 hours',  quality: 'premium',  description: 'Premium followers, no drop, 365-day refill.' },
    { externalId: '23', name: 'Instagram Likes [Instant] [Max 50K]',           platform: 'Instagram', category: 'Likes',     rate: 0.12, minOrder: 10,   maxOrder: 50000,  avgTime: '0-5 mins',   quality: 'standard', description: 'Instant likes, instant start.' },
    { externalId: '24', name: 'Instagram Views [Cheapest] [Max 10M]',          platform: 'Instagram', category: 'Views',     rate: 0.02, minOrder: 100,  maxOrder: 10000000,avgTime: '0-2 mins',  quality: 'standard', description: 'Ultra-cheap reel/video views.' },

    // ─── TikTok ───────────────────────────────────────────────────────
    { externalId: '31', name: 'TikTok Followers [Real] [Max 200K]',            platform: 'TikTok',    category: 'Followers', rate: 0.90, minOrder: 50,   maxOrder: 200000, avgTime: '0-2 hours',  quality: 'standard', description: 'Real-looking TikTok followers.' },
    { externalId: '32', name: 'TikTok Likes [Premium] [Max 100K]',             platform: 'TikTok',    category: 'Likes',     rate: 0.15, minOrder: 10,   maxOrder: 100000, avgTime: '0-5 mins',   quality: 'premium',  description: 'Premium likes with refill guarantee.' },
    { externalId: '33', name: 'TikTok Views [Fast] [Max 10M]',                 platform: 'TikTok',    category: 'Views',     rate: 0.01, minOrder: 100,  maxOrder: 10000000,avgTime: '0-1 min',   quality: 'standard', description: 'Ultra-fast TikTok views, instant.' },
    { externalId: '34', name: 'TikTok Comments [Custom] [Max 5K]',             platform: 'TikTok',    category: 'Comments',  rate: 1.20, minOrder: 10,   maxOrder: 5000,   avgTime: '0-30 mins',  quality: 'premium',  description: 'Custom comments from real accounts.' },

    // ─── YouTube ──────────────────────────────────────────────────────
    { externalId: '41', name: 'YouTube Subscribers [Real] [Max 100K]',         platform: 'YouTube',   category: 'Subscribers',rate: 3.50, minOrder: 50,   maxOrder: 100000, avgTime: '1-12 hours', quality: 'standard', description: 'Real YT subscribers, monetization-safe.' },
    { externalId: '42', name: 'YouTube Views [Monetizable] [Max 1M]',          platform: 'YouTube',   category: 'Views',     rate: 1.10, minOrder: 500,  maxOrder: 1000000,avgTime: '0-6 hours',  quality: 'premium',  description: 'High-retention views, safe for monetization.' },
    { externalId: '43', name: 'YouTube Watch Time [4000 Hours] [Monetization]',platform: 'YouTube',   category: 'WatchTime', rate: 25.00,minOrder: 1000, maxOrder: 100000, avgTime: '3-7 days',   quality: 'premium',  description: '4000 watch hours for monetization eligibility.' },
    { externalId: '44', name: 'YouTube Likes [Instant] [Max 50K]',             platform: 'YouTube',   category: 'Likes',     rate: 0.80, minOrder: 20,   maxOrder: 50000,  avgTime: '0-15 mins',  quality: 'standard', description: 'Instant YT likes.' },

    // ─── Twitter / X ──────────────────────────────────────────────────
    { externalId: '51', name: 'Twitter Followers [Real] [Max 50K]',            platform: 'Twitter',   category: 'Followers', rate: 4.80, minOrder: 50,   maxOrder: 50000,  avgTime: '0-6 hours',  quality: 'standard', description: 'Real-looking Twitter/X followers.' },
    { externalId: '52', name: 'Twitter Likes [Instant] [Max 20K]',             platform: 'Twitter',   category: 'Likes',     rate: 0.90, minOrder: 20,   maxOrder: 20000,  avgTime: '0-15 mins',  quality: 'standard', description: 'Instant tweet likes.' },
  ];

  // Check how many services already exist
  const existing = await db.service.count({ where: { widgetId: widget.id } });
  if (existing >= services.length) {
    console.log(`✅ Services already seeded (${existing} found). Skipping.`);
    return;
  }

  // Delete any partial seed and re-insert
  await db.service.deleteMany({ where: { widgetId: widget.id } });

  const created = await db.service.createMany({
    data: services.map(s => ({ ...s, widgetId: widget.id })),
  });

  console.log(`✅ Seeded ${created.count} services for widget "${widget.botName}".`);
  console.log('   Platforms covered:', [...new Set(services.map(s => s.platform))].join(', '));
  console.log('   Categories covered:', [...new Set(services.map(s => s.category))].join(', '));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
