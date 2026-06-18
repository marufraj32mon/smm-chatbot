/**
 * Dry-run: verify Groq SDK is properly installed and importable.
 * This does NOT make a real API call — just checks the SDK is installed.
 */
import Groq from 'groq-sdk';

console.log('✅ groq-sdk imported successfully');
console.log('✅ Groq class available:', typeof Groq);

// Construct with fake key just to verify the class instantiates
const fake = new Groq({ apiKey: 'gsk_TEST_KEY_FOR_VERIFICATION_ONLY' });
console.log('✅ Client instantiated:', typeof fake);
console.log('✅ chat.completions.create available:', typeof fake.chat?.completions?.create);

console.log('\n🎉 Groq SDK installation verified — ready for production use.');
console.log('   User needs to set GROQ_API_KEY env var with their real key.');
console.log('   Get a free key at: https://console.groq.com/keys');
