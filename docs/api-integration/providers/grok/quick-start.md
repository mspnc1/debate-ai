# Grok 4 API Quick Start Guide

## Authentication

### Required Headers
```javascript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',  // Bearer token format
  'Content-Type': 'application/json'       // JSON content
}
```

### API Key Format
- Obtain from: https://console.x.ai (API → API Keys section)
- **Subscription Required**: SuperGrok ($300/year) or SuperGrok Heavy ($3,000/year)
- Store securely - keys are shown only once

### API Compatibility
Grok 4 API is compatible with both OpenAI and Anthropic SDKs:
```javascript
// OpenAI SDK compatibility
const openai = new OpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.GROK_API_KEY
});
```

## Available Models & Pricing

### Grok 4 Series (2025)
| Model | Context Window | Max Output | Input (per 1M) | Output (per 1M) | Best For |
|-------|---------------|------------|----------------|-----------------|----------|
| Grok 4 | 128K-256K | Not specified | $3.00 | $15.00 | Complex reasoning, multimodal |
| Grok 4 Heavy | 256K | Not specified | Premium tier | Premium tier | Advanced tasks, priority support |
| Grok 3 | 131K | Not specified | Lower cost | Lower cost | Basic tasks |
| Grok 3 Mini | 131K | Not specified | Lowest cost | Lowest cost | Simple, high-volume |

### Special Pricing
- **Cached Input**: $0.75 per 1M tokens (75% discount)
- **Live Search**: $25 per 1,000 sources ($0.025 per source)
- **Knowledge Cutoff**: November 2024

## Subscription Tiers

| Tier | Annual Cost | Features |
|------|-------------|----------|
| Basic | Free | Grok 3 only, 8K tokens/month |
| SuperGrok | $300 | Grok 4 access, 128K context, 1M tokens/month |
| SuperGrok Heavy | $3,000 | Grok 4 Heavy, 256K context, priority support |

## Basic Chat Request

```javascript
const response = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'grok-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user',
        content: 'What is the capital of France?'
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## Streaming Responses

```javascript
const response = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'grok-4',
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ],
    stream: true  // Enable streaming
  })
});

// Handle token-by-token streaming
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim() !== '');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
        }
      } catch (e) {
        // Skip parsing errors
      }
    }
  }
}
```

## Rate Limits & Error Handling

### Rate Limit Structure
- **Standard**: 60 requests/minute, 16,000 tokens/minute
- **Enhanced**: 2 million tokens/minute, 480 requests/minute
- **Non-premium**: ~20 requests per 2 hours

### Rate Limit Headers
```javascript
// Response headers to monitor
{
  'x-ratelimit-limit-requests': '1000',      // Daily limit
  'x-ratelimit-remaining-requests': '950',   // Remaining today
  'x-ratelimit-reset-requests': '1640995200', // Reset timestamp
  'retry-after': '60'  // Only on 429 errors
}
```

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid API key | Check API key and subscription |
| 429 | Rate limit exceeded | Implement exponential backoff |
| 500 | Server error | Retry with backoff |
| 400 | Bad request | Check request format |

### Exponential Backoff Implementation
```javascript
async function makeRequestWithRetry(requestOptions, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', requestOptions);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter ? 
          parseInt(retryAfter) * 1000 : 
          Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 60000);
        
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (response.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## Important Grok 4 Differences

### From Grok 3 to Grok 4
```javascript
// ❌ These parameters are NOT supported in Grok 4:
{
  presencePenalty: 0.5,    // Will cause error
  frequencyPenalty: 0.5,   // Will cause error  
  stop: ['END'],           // Will cause error
  reasoning_effort: 'high' // Grok 4 doesn't use this
}

// ✅ Grok 4 is always in reasoning mode
{
  model: 'grok-4',
  messages: [...],
  temperature: 0.7,
  max_tokens: 1000
  // Reasoning is automatic, no parameter needed
}
```

## Response Format

### Standard Response
```json
{
  "id": "chat-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "grok-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 8,
    "total_tokens": 33
  }
}
```

## Best Practices

1. **API Key Security**: Store in environment variables, never commit to code
2. **Rate Limit Management**: Implement caching to reduce redundant calls
3. **Error Handling**: Always use exponential backoff for 429 errors
4. **Model Selection**:
   - Use Grok 4 for complex reasoning and multimodal tasks
   - Use Grok 3 Mini for simple, high-volume queries
   - Consider Grok 4 Heavy for mission-critical applications
5. **Cost Optimization**: Use cached inputs when possible (75% discount)
6. **Streaming**: Essential for real-time debate responses

## Quick Integration Example

```javascript
class GrokService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.x.ai/v1/chat/completions';
  }

  async sendMessage(message, model = 'grok-4') {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
        max_tokens: 1000
      })
    };

    const response = await this.makeRequestWithRetry(requestOptions);
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async streamMessage(message, onChunk, model = 'grok-4') {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
        stream: true
      })
    };

    // Streaming implementation from above
    const response = await fetch(this.baseURL, requestOptions);
    // ... handle streaming
  }

  async makeRequestWithRetry(options, maxRetries = 5) {
    // Implementation from above
  }
}

// Usage
const grok = new GrokService(process.env.GROK_API_KEY);
const response = await grok.sendMessage('Hello, Grok 4!');

// With OpenAI SDK
import OpenAI from 'openai';
const client = new OpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.GROK_API_KEY
});

const completion = await client.chat.completions.create({
  model: 'grok-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## Migration from Other Providers

```javascript
// From OpenAI
// Change: baseURL and model name only
const client = new OpenAI({
  baseURL: 'https://api.x.ai/v1',  // Changed
  apiKey: process.env.GROK_API_KEY  // Changed
});

// From Anthropic
// Similar minimal changes required
```

## Next Steps
- See [advanced-features.md](./advanced-features.md) for multimodal, function calling, live search
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://docs.x.ai