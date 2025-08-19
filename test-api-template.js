// Template for API testing that reads from environment variables
// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Get API keys from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

// Your test code here
console.log('API key loaded from environment successfully');
console.log('Key starts with:', OPENAI_API_KEY.substring(0, 10) + '...');