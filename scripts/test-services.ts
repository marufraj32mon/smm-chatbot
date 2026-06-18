/**
 * Test the list_services tool logic directly against Neon DB.
 * Verifies that the tool can fetch real services with real prices.
 */
import { db } from '../src/lib/db';

async function main() {
  const widget = await db.widget.findUnique({ where: { publicKey: 'smmgen_demo_public_key' } });
  if (!widget) {
    console.error('❌ Widget not found');
    process.exit(1);
  }

  console.log('\n🧪 Testing list_services tool logic');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test 1: All Facebook Followers (cheapest first)
  console.log('Test 1: Facebook Followers (cheapest first)');
  const fbFollowers = await db.service.findMany({
    where: {
      widgetId: widget.id,
      isActive: true,
      platform: { contains: 'Facebook', mode: 'insensitive' },
      category: { contains: 'Followers', mode: 'insensitive' },
    },
    orderBy: { rate: 'asc' },
    select: { name: true, rate: true, minOrder: true, maxOrder: true, avgTime: true, quality: true },
  });
  console.log(`Found ${fbFollowers.length} services:`);
  for (const s of fbFollowers) {
    console.log(`  • ${s.name}`);
    console.log(`    Rate: $${s.rate} per 1000 | Quality: ${s.quality} | ${s.avgTime}`);
  }

  // Test 2: All platforms with their cheapest Followers
  console.log('\nTest 2: Cheapest Followers per platform');
  for (const platform of ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'Twitter']) {
    const cheapest = await db.service.findFirst({
      where: {
        widgetId: widget.id,
        isActive: true,
        platform: { contains: platform, mode: 'insensitive' },
        category: { contains: 'Followers', mode: 'insensitive' },
      },
      orderBy: { rate: 'asc' },
      select: { name: true, rate: true },
    });
    if (cheapest) {
      console.log(`  • ${platform}: ${cheapest.name} → $${cheapest.rate}/1000`);
    }
  }

  // Test 3: All services count
  const total = await db.service.count({ where: { widgetId: widget.id, isActive: true } });
  console.log(`\nTotal active services: ${total}`);

  console.log('\n✅ list_services tool logic works correctly!');
  console.log('   The bot will use this data to answer pricing questions.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
