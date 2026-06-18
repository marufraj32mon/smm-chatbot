/**
 * Seed the default chatbot widget config.
 * Run with: bun run /home/z/my-project/scripts/seed.ts
 *
 * Idempotent — only inserts if missing.
 */
import { db } from '../src/lib/db';
import { randomBytes } from 'crypto';

async function main() {
  const publicKey = 'smmgen_demo_public_key';
  const existing = await db.widget.findUnique({ where: { publicKey } });
  if (existing) {
    console.log('Default widget already exists — skipping seed.');
    return;
  }

  await db.widget.create({
    data: {
      publicKey,
      secretKey:       randomBytes(24).toString('hex'),
      panelName:       'SMMGEN',
      panelDomain:     'https://smmgen.example.com',
      botName:         'SMMGEN AI Assistant',
      widgetColor:     '#6c5ce7',
      buttonShape:     'circle',
      buttonIcon:      'chat',
      greetingMessage: `👋 Welcome to SMMGEN AI Assistant!

I recommend the best services using performance data, pricing, and insights from SMMGEN's order history.

**What I can do:**
• Best services for your needs
• Service suggestion & Recent Order history check
• Price & quality suggestions
• General questions — in any language

Just type your question, and I'll assist you instantly ✨`,
      greetingSuggestions: JSON.stringify([
        'Hello',
        'Best TikTok Likes',
        'What is the best Facebook followers?',
        'Any other options?',
      ]),
      greetingIntervalHours: 24,
      smmApiBase:        'https://mothersmm.com/adminapi/v2',
      smmApiKey:         '',
      systemPromptExtra: '',
    },
  });
  console.log('✅ Seeded default widget. publicKey=' + publicKey);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
