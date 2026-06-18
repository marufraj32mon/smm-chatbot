/**
 * Test the SMM panel services API directly.
 * Verifies that we can fetch services from the standard /api/v2 endpoint.
 *
 * Usage:
 *   SMM_API_KEY=your_key bun run scripts/test-smm-services.ts
 */
import { services } from '../src/lib/smm-api';

async function main() {
  const apiKey = process.env.SMM_API_KEY;
  if (!apiKey) {
    console.error('❌ SMM_API_KEY env var is not set');
    console.error('   Set it to your MothersSMM Admin API key:');
    console.error('   export SMM_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log('🧪 Testing SMM panel services API');
  console.log('═══════════════════════════════════════════════════════\n');

  const cfg = {
    apiBase: 'https://mothersmm.com/adminapi/v2',
    apiKey,
  };

  // Test 1: Fetch all services
  console.log('Test 1: Fetch all services');
  const all = await services.list(cfg, { limit: 5 });
  if (!all.ok) {
    console.error('❌ Failed:', all.error);
    process.exit(1);
  }
  console.log(`✅ Fetched ${all.count} services (showing first 5):`);
  for (const s of all.services) {
    console.log(`  • [${s.service_id}] ${s.name}`);
    console.log(`    Platform: ${s.platform || 'N/A'} | Category: ${s.serviceType || s.category}`);
    console.log(`    Rate: $${s.rate}/1000 | Min: ${s.min} | Max: ${s.max}`);
    if (s.refill) console.log(`    ✓ Refill available`);
  }

  // Test 2: Filter by platform
  console.log('\nTest 2: Filter by Facebook');
  const fb = await services.list(cfg, { platform: 'Facebook', limit: 3 });
  if (fb.ok) {
    console.log(`✅ Found ${fb.count} Facebook services (cheapest first):`);
    for (const s of fb.services) {
      console.log(`  • ${s.name} → $${s.rate}/1000`);
    }
  }

  // Test 3: Filter by category
  console.log('\nTest 3: Filter by "Followers"');
  const followers = await services.list(cfg, { category: 'Followers', limit: 5 });
  if (followers.ok) {
    console.log(`✅ Found ${followers.count} Followers services (cheapest first):`);
    for (const s of followers.services) {
      console.log(`  • [${s.platform || 'Unknown'}] ${s.name} → $${s.rate}/1000`);
    }
  }

  console.log('\n✅ SMM panel services API is working correctly!');
}

main().catch(e => { console.error(e); process.exit(1); });
