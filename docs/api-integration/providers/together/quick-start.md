# Together AI API Quick Start Guide

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
- Obtain from: https://api.together.xyz
- Navigate to Settings > API Keys
- **Important**: Store key securely
- Available tiers: Free (1 QPS) and Paid (10+ QPS)
- Store in environment variables

### API Endpoint
```javascript
const baseURL = 'https://api.together.xyz/v1';  // OpenAI-compatible endpoint
```

## Available Models & Pricing

### Llama Models (Meta)
| Model | Context | Input/Output (per 1M) | Best For |
|-------|---------|----------------------|----------|
| Llama 3.3 70B Turbo | 128K | $0.88 / $0.88 | Recommended starter |
| Llama 3.1 405B | 128K | $3.50 / $3.50 | Highest capability |
| Llama 3.1 70B | 128K | $0.88 / $0.88 | Balanced performance |
| Llama 3.1 8B | 128K | $0.18 / $0.18 | Fast, cost-effective |
| Llama 3.2 90B Vision | 128K | $1.20 / $1.20 | Multimodal tasks |
| Llama 3.2 11B Vision | 128K | $0.18 / $0.18 | Vision + text |
| Llama 3.2 3B | 128K | $0.06 / $0.06 | Mobile/edge |
| Llama 3.2 1B | 128K | $0.04 / $0.04 | Lightest weight |

### Mixtral Models
| Model | Context | Input/Output (per 1M) | Best For |
|-------|---------|----------------------|----------|
| Mixtral 8x7B | 32K | $0.60 / $0.60 | Fast MoE inference |
| Mixtral 8x22B | 64K | $1.20 / $1.20 | Larger MoE model |
| DiscoLM Mixtral 8x7B | 32K | $0.60 / $0.60 | Specialized variant |

### DeepSeek Models
| Model | Context | Input/Output (per 1M) | Best For |
|-------|---------|----------------------|----------|
| DeepSeek R1 | 64K | $0.55 / $2.19 | Reasoning tasks |
| DeepSeek V3 | 128K | $0.27 / $1.10 | General purpose |
| DeepSeek Coder V2 | 128K | $0.30 / $0.30 | Code generation |

### Qwen Models (Alibaba)
| Model | Context | Input/Output (per 1M) | Best For |
|-------|---------|----------------------|----------|
| Qwen 2.5 72B | 32K | $1.20 / $1.20 | High performance |
| Qwen 2.5 32B | 32K | $0.80 / $0.80 | Balanced |
| Qwen 2.5 14B | 32K | $0.30 / $0.30 | Efficient |
| Qwen 2.5 7B | 32K | $0.20 / $0.20 | Fast responses |
| QwQ 32B Preview | 32K | $1.20 / $1.20 | Reasoning focus |

### Special Pricing
- **Batch Inference**: 50% discount on all tokens for supported models
- **Dedicated Endpoints**: Custom per-minute billing
- **Enterprise**: Contact sales for volume discounts

## Rate Limits

### Tier Structure
| Tier | Requests/Second | Requests/Minute | Tokens/Minute |
|------|----------------|-----------------|---------------|
| Free | 1 QPS | 0.3 RPM (DeepSeek R1) | Limited |
| Build 1 | 10 QPS | 3 RPM | 100K |
| Build 2 | 10 QPS | 60 RPM | 1M |
| Build 3-4 | 10 QPS | 400+ RPM | 10M |
| Build 5+ | 10 QPS | 1200+ RPM | 50M |
| Enterprise | Custom | Unlimited | Unlimited |

## Basic Chat Request (OpenAI-Compatible)

```javascript
const response = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
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
    stop: ["<|eot_id|>"]  // Model-specific stop tokens
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## Streaming Responses (SSE)

```javascript
const response = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
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

## JSON Mode

```javascript
const jsonResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
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

## Function Calling (Tool Use)

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
      },
      strict: true  // Enforce schema compliance
    }
  }
];

const response = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',  // Supports function calling
    messages: [
      { role: 'user', content: 'What\'s the weather in Paris?' }
    ],
    tools: tools,
    tool_choice: 'auto'
  })
});
```

## Vision Models

```javascript
const visionResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What do you see in this image?'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/jpeg;base64,/9j/4AAQ...'  // Base64 image
            }
          }
        ]
      }
    ],
    max_tokens: 500
  })
});
```

## Error Handling

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid API key | Check API key |
| 429 | Rate limit exceeded | Implement backoff |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Exponential Backoff Implementation
```javascript
async function makeRequestWithRetry(requestOptions, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', requestOptions);
      
      if (response.status === 429) {
        // Rate limited - check headers for retry info
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.min(Math.pow(2, attempt) * 1000, 60000);
        
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (response.status >= 500) {
        // Server error - retry with backoff
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

## Response Format (OpenAI-Compatible)

### Standard Response
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
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
    "total_tokens": 33
  }
}
```

## Embeddings

```javascript
const embeddingResponse = await fetch('https://api.together.xyz/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'BAAI/bge-large-en-v1.5',
    input: [
      'First text to embed',
      'Second text to embed'
    ]
  })
});

const embeddings = await embeddingResponse.json();
```

## Best Practices

1. **API Key Security**: Store in environment variables, never commit to code
2. **Model Selection**:
   - Use Llama 3.3 70B Turbo for general tasks (recommended)
   - Use Llama 3.1 405B for maximum capability
   - Use Llama 3.2 Vision models for multimodal
   - Use Mixtral for fast MoE inference
   - Use DeepSeek R1 for reasoning tasks
3. **Rate Limit Management**: Implement exponential backoff
4. **Streaming**: Use for real-time responses
5. **Batch Processing**: Take advantage of 50% discount
6. **OpenAI Compatibility**: Easy migration from OpenAI

## Quick Integration Example

```javascript
import OpenAI from 'openai';

// Use OpenAI SDK with Together endpoint
const together = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1'
});

// Standard completion
const completion = await together.chat.completions.create({
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  messages: [
    { role: 'user', content: 'Hello, Together!' }
  ],
  temperature: 0.7,
  max_tokens: 1000
});

// Streaming
const stream = await together.chat.completions.create({
  model: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
  messages: [{ role: 'user', content: 'Tell me a joke' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

// Function calling
const result = await together.chat.completions.create({
  model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  messages: [{ role: 'user', content: 'What\'s the weather?' }],
  tools: tools,
  tool_choice: 'auto'
});
```

## Important Notes

- **OpenAI Compatible**: Full compatibility with OpenAI client libraries
- **200+ Models**: Access to extensive open-source model collection
- **Pay-per-Token**: Serverless pricing model
- **Fast Performance**: 4x faster than vLLM with Together Inference Stack
- **Flexible Deployment**: Serverless, dedicated, VPC, or on-premise
- **Model Ownership**: Full ownership with migration freedom

## Next Steps
- See [advanced-features.md](./advanced-features.md) for batch processing, dedicated endpoints
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://docs.together.ai