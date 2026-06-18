/**
 * Dry-run: verify Gemini SDK is properly installed and importable.
 * This does NOT make a real API call — just checks the SDK is installed.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('✅ @google/generative-ai imported successfully');
console.log('✅ GoogleGenerativeAI class available:', typeof GoogleGenerativeAI);

// Construct with fake key just to verify the class instantiates
const fake = new GoogleGenerativeAI('AIzaSyTEST_KEY_FOR_VERIFICATION_ONLY');
console.log('✅ Client instantiated:', typeof fake);
console.log('✅ getGenerativeModel available:', typeof fake.getGenerativeModel);

const model = fake.getGenerativeModel({ model: 'gemini-1.5-flash' });
console.log('✅ Model object created:', typeof model);
console.log('✅ generateContent available:', typeof model.generateContent);

console.log('\n🎉 Gemini SDK installation verified — ready for production use.');
console.log('   User needs to set GEMINI_API_KEY env var with their real key.');
