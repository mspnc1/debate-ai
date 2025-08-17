# DeepSeek API Quick Start Guide

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
- Obtain from: https://platform.deepseek.com
- Navigate to Account Dashboard > API Keys
- **Important**: Store key securely
- No explicit rate limits - designed for commercial use
- Store in environment variables

### API Endpoint
```javascript
const baseURL = 'https://api.deepseek.com/v1';  // OpenAI-compatible endpoint
// Alternative: https://api.deepseek.com
```

## Available Models & Pricing

### Current Models (2025)
| Model | Context | Input (per 1M) | Output (per 1M) | Cache Hit | Best For |
|-------|---------|----------------|-----------------|-----------|----------|
| deepseek-reasoner (R1-0528) | 64K | $0.55 | $2.19 | $0.14 | Complex reasoning, math |
| deepseek-chat (V3-0324) | 128K | $0.27 | $1.10 | $0.07 | General purpose |
| DeepSeek-R1 | 64K | $0.55 | $2.19 | $0.14 | Step-by-step reasoning |
| DeepSeek-V3 | 128K | $0.27 | $1.10 | $0.07 | Fast general tasks |

### Off-Peak Pricing (16:30-00:30 UTC)
- **50% discount** on all models during off-peak hours
- Pricing determined by completion timestamp
- Automatic discount applied

### Special Pricing Notes
- **Context Caching**: Reduced prices for repeated inputs
- **R1 Output**: Includes both Chain-of-Thought (CoT) and final answer tokens
- **No rate limits**: Pay only for what you use

## No Rate Limits Policy

DeepSeek uniquely offers **NO explicit rate limits**:
- Unlimited requests per minute/second
- Automatic load balancing
- Response slowing under heavy load instead of rejection
- Keep-alive signals maintain connections
- 30-minute maximum request timeout

## Basic Chat Request (OpenAI-Compatible)

```javascript
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-chat',  // or 'deepseek-reasoner'
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
    max_tokens: 1000,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## Using OpenAI SDK

```javascript
import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1'
});

const completion = await deepseek.chat.completions.create({
  model: 'deepseek-chat',
  messages: [
    { role: 'user', content: 'Hello, DeepSeek!' }
  ],
  temperature: 0.7
});

console.log(completion.choices[0].message.content);
```

## Streaming Responses (SSE)

```javascript
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ],
    stream: true  // Enable SSE streaming
  })
});

// Handle SSE stream (OpenAI-compatible format)
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
      
      // Keep-alive signals
      if (line.includes(': keep-alive')) {
        continue;  // Connection still active
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

## Reasoning with DeepSeek-R1

```javascript
const reasoningResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-reasoner',  // R1 model for reasoning
    messages: [
      {
        role: 'user',
        content: 'Solve: If x^2 + 5x + 6 = 0, what are the values of x?'
      }
    ],
    temperature: 0.1,  // Lower for reasoning tasks
    max_tokens: 4000   // R1 uses ~23K tokens for thinking
  })
});

const data = await reasoningResponse.json();
// Response includes Chain-of-Thought reasoning + final answer
console.log(data.choices[0].message.content);
```

## JSON Mode

```javascript
const jsonResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-reasoner',  // R1 supports JSON output
    messages: [
      {
        role: 'user',
        content: 'List 3 programming languages with their uses in JSON format'
      }
    ],
    response_format: { 
      type: 'json_object'  // Enable JSON mode
    },
    max_tokens: 500
  })
});

const data = await jsonResponse.json();
const structuredOutput = JSON.parse(data.choices[0].message.content);
```

## Function Calling (R1-0528+)

```javascript
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City and country, e.g. San Francisco, USA'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit']
          }
        },
        required: ['location']
      }
    }
  }
];

const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-reasoner',  // R1 supports function calling
    messages: [
      { role: 'user', content: 'What\'s the weather in Paris?' }
    ],
    tools: tools,
    tool_choice: 'auto'
  })
});
```

## Context Caching

```javascript
// First request - full price
const firstResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'You are an expert on quantum physics. [Large context...]'
      },
      {
        role: 'user',
        content: 'Explain quantum entanglement'
      }
    ]
  })
});

// Subsequent requests with same context - cache hit pricing (75% cheaper)
const cachedResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: 'You are an expert on quantum physics. [Large context...]'  // Same context
      },
      {
        role: 'user',
        content: 'What about quantum tunneling?'  // Different question
      }
    ]
  })
});
```

## Error Handling

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid API key | Check API key |
| 429 | Never returned | DeepSeek doesn't reject for rate limits |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |
| Timeout | Request > 30 minutes | Retry or reduce complexity |

### Handling Slow Responses
```javascript
async function makeRequestWithTimeout(requestOptions, timeout = 300000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      ...requestOptions,
      signal: controller.signal
    });
    
    clearTimeout(id);
    
    if (!response.ok && response.status >= 500) {
      // Server error - retry with backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return makeRequestWithTimeout(requestOptions, timeout);
    }
    
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.log('Request timeout - DeepSeek may be under heavy load');
      // Retry or handle timeout
    }
    throw error;
  }
}
```

## Response Format (OpenAI-Compatible)

### Standard Response
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris.",
        "tool_calls": null
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 8,
    "total_tokens": 33,
    "prompt_cache_hit_tokens": 0,  // Context cache hits
    "prompt_cache_miss_tokens": 25
  }
}
```

### Reasoning Response (R1)
```json
{
  "id": "chatcmpl-xyz789",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "deepseek-reasoner",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "<Thought>\n[23,000 tokens of reasoning]\n</Thought>\n\nThe values of x are -2 and -3."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 23150,  // Includes CoT reasoning
    "total_tokens": 23200
  }
}
```

## Best Practices

1. **API Key Security**: Store in environment variables, never commit to code
2. **Model Selection**:
   - Use `deepseek-reasoner` for complex math, logic, and step-by-step reasoning
   - Use `deepseek-chat` for general conversations and fast responses
   - R1 averages 23K tokens for reasoning, plan accordingly
3. **Cost Optimization**:
   - Use off-peak hours (16:30-00:30 UTC) for 50% discount
   - Leverage context caching for repeated contexts
   - Use V3 for simple tasks, R1 only when reasoning needed
4. **No Rate Limits**: Take advantage but be respectful of shared resources
5. **Streaming**: Use for real-time responses
6. **Long Requests**: Implement timeout handling for 30-minute limit

## Quick Integration Example

```javascript
class DeepSeekService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.deepseek.com/v1';
  }

  async sendMessage(message, options = {}) {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.reasoning ? 'deepseek-reasoner' : 'deepseek-chat',
        messages: [{ role: 'user', content: message }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined
      })
    };

    const response = await fetch(`${this.baseURL}/chat/completions`, requestOptions);
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async streamMessage(message, onChunk, model = 'deepseek-chat') {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
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
    });

    // Handle SSE streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Parse SSE events and call onChunk
      this.parseStreamChunk(chunk, onChunk);
    }
  }

  parseStreamChunk(chunk, onChunk) {
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (e) {
          // Skip parsing errors and keep-alive signals
        }
      }
    }
  }
}

// Usage
const deepseek = new DeepSeekService(process.env.DEEPSEEK_API_KEY);

// Standard message
const response = await deepseek.sendMessage('Hello, DeepSeek!');

// Reasoning task
const reasoning = await deepseek.sendMessage(
  'Solve this step by step: x^2 + 5x + 6 = 0',
  { reasoning: true }
);

// Streaming
await deepseek.streamMessage(
  'Tell me a story',
  (chunk) => process.stdout.write(chunk)
);
```

## Important Notes

- **OpenAI Compatible**: Full compatibility with OpenAI client libraries
- **No Rate Limits**: Unique unlimited request policy
- **Context Caching**: Automatic 75% discount on repeated contexts
- **Off-Peak Discount**: 50% off during 16:30-00:30 UTC
- **R1 Reasoning**: Averages 23K tokens for deep reasoning
- **30-Minute Timeout**: Maximum request duration

## Next Steps
- See [advanced-features.md](./advanced-features.md) for reasoning, function calling
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://api-docs.deepseek.com