# Perplexity API Quick Start Guide

## Authentication

### Required Headers
```javascript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',  // Bearer token format
  'Content-Type': 'application/json',      // JSON content
  'Accept': 'application/json'             // Accept JSON responses
}
```

### API Key Setup
- Obtain from: https://www.perplexity.ai/settings/api
- **Requirement**: Perplexity Pro subscription for API access
- **Purchase Credits**: Add payment method and buy API credits
- Store API key securely in environment variables

### API Endpoint
```javascript
const baseURL = 'https://api.perplexity.ai/chat/completions';
```

## Available Models & Pricing

### Sonar Models (2025)
| Model | Context Window | Search | Input Cost | Output Cost | Best For |
|-------|---------------|--------|------------|-------------|----------|
| Sonar | 127K tokens | Yes | $1 per 750K words | $1 per 750K words | Fast, cost-efficient |
| Sonar Pro | 200K tokens | Yes | $3 per 750K words | $15 per 750K words | Complex queries |

### Additional Costs
- **Base Search Cost**: $5 per 1,000 searches (Sonar)
- **No Citation Token Charges**: Free until April 18, 2025
- **After April 18, 2025**: Citations included in search_results field

### Llama-Based Models
| Model | Parameters | Context Window | Best For |
|-------|------------|----------------|----------|
| Llama-3.1-Sonar-Small | 8B | 127K tokens | Efficient text |
| Llama-3.1-Sonar-Large | 70B | 127K tokens | Balanced performance |
| Llama-3.1-Sonar-Huge | 405B | 128K tokens | Maximum capability |

## Rate Limits

### Current Limits
- **50 requests per minute** (all tiers)
- Relatively restrictive compared to other providers
- No daily limits specified

## Basic Chat Request with Search

```javascript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant with web search capabilities.'
      },
      {
        role: 'user',
        content: 'What are the latest developments in quantum computing?'
      }
    ],
    max_tokens: 1000,
    temperature: 0.7,
    search_domain_filter: [],  // Optional: limit to specific domains
    return_citations: true,    // Include source citations
    search_recency_filter: 'month'  // Optional: filter by recency
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
console.log('Sources:', data.search_results);
```

## Streaming Responses (SSE)

```javascript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar',
    messages: [
      { role: 'user', content: 'Explain quantum computing' }
    ],
    stream: true  // Enable SSE streaming
  })
});

// Handle SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      
      if (data === '[DONE]') {
        console.log('Stream complete');
        break;
      }
      
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
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

## Error Handling

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid API key | Check API key and Pro subscription |
| 429 | Rate limit exceeded | Implement exponential backoff (50 req/min) |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Exponential Backoff Implementation
```javascript
async function makeRequestWithRetry(requestOptions, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', requestOptions);
      
      if (response.status === 429) {
        // Check for Retry-After header
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter ? 
          parseInt(retryAfter) * 1000 : 
          Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 60000);
        
        console.log(`Rate limited (50 req/min). Retrying in ${delay}ms...`);
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

## Response Format with Citations

### Standard Response
```json
{
  "id": "req_abc123",
  "model": "sonar",
  "object": "chat.completion",
  "created": 1677652288,
  "choices": [
    {
      "index": 0,
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "Quantum computing uses quantum bits..."
      },
      "delta": {
        "role": "assistant",
        "content": ""
      }
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175,
    "input_tokens_cost": 0.000033,
    "output_tokens_cost": 0.0002,
    "request_cost": 0.005,
    "total_cost": 0.005233
  },
  "search_results": [
    {
      "title": "Quantum Computing Breakthrough",
      "url": "https://example.com/quantum",
      "snippet": "Recent advances in quantum...",
      "publication_date": "2025-01-15"
    }
  ]
}
```

## OpenAI SDK Compatibility

```javascript
// Perplexity works with OpenAI's client library
import OpenAI from 'openai';

const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai'
});

const completion = await perplexity.chat.completions.create({
  model: 'sonar',
  messages: [
    { role: 'user', content: 'What is the capital of France?' }
  ]
});

console.log(completion.choices[0].message.content);
```

## Best Practices

1. **Rate Limit Management**: Stay well under 50 req/min limit
2. **Use Caching**: Cache search results to reduce API calls
3. **Model Selection**:
   - Use Sonar for general queries (cheapest)
   - Use Sonar Pro for complex research (2x citations)
4. **Domain Filtering**: Limit searches to trusted domains when appropriate
5. **Recency Filtering**: Use time filters for current events
6. **Error Handling**: Always implement exponential backoff
7. **Cost Monitoring**: Track search counts and token usage

## Quick Integration Example

```javascript
class PerplexityService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.perplexity.ai/chat/completions';
    this.requestCount = 0;
    this.resetTime = Date.now() + 60000;
  }

  async sendMessage(message, options = {}) {
    // Rate limit check (50 req/min)
    await this.checkRateLimit();
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'sonar',
        messages: [{ role: 'user', content: message }],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        return_citations: true,
        search_domain_filter: options.domains || [],
        search_recency_filter: options.recency || 'month'
      })
    };

    const response = await this.makeRequestWithRetry(requestOptions);
    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      sources: data.search_results || []
    };
  }

  async checkRateLimit() {
    const now = Date.now();
    
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }
    
    if (this.requestCount >= 45) { // Stay under 50 req/min
      const waitTime = this.resetTime - now;
      console.log(`Rate limit approaching. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requestCount++;
  }

  async makeRequestWithRetry(options, maxRetries = 5) {
    // Implementation from above
  }
}

// Usage
const perplexity = new PerplexityService(process.env.PERPLEXITY_API_KEY);
const result = await perplexity.sendMessage(
  'What are the latest AI developments?',
  { 
    model: 'sonar-pro',
    recency: 'week',
    domains: ['arxiv.org', 'nature.com'] 
  }
);

console.log('Answer:', result.content);
console.log('Sources:', result.sources);
```

## Important Notes

- **Pro Subscription Required**: API access requires Perplexity Pro
- **50 req/min limit**: Very restrictive, plan accordingly
- **Real-time Search**: All responses include live web search
- **Citation Changes**: After April 18, 2025, citation format changes
- **Cost Structure**: Pay per search + per token usage

## Next Steps
- See [advanced-features.md](./advanced-features.md) for domain filtering, deep research
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://docs.perplexity.ai